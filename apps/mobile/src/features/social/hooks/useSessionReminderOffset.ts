import { useEffect, useState, useCallback } from "react";
import auth from "@react-native-firebase/auth";
import firestore, { doc, getDoc, setDoc } from "@react-native-firebase/firestore";
import { storage } from "@/src/lib/storage";
import { logger } from "@/src/lib/logger";

/**
 * useSessionReminderOffset — the user-tunable reminder lead time for local
 * session reminders (minutes before the session starts), plus an on/off
 * toggle for the feature itself.
 *
 * Storage follows the app's preference pattern:
 *   - MMKV (`@sessionReminderOffsetMin` / `@sessionRemindersEnabled`) is the
 *     hot, synchronous source — read at module load so every consumer starts
 *     with the same value.
 *   - Firestore `users/{uid}.sessionReminderOffsetMin` +
 *     `sessionRemindersEnabled` sync the choice across devices (written
 *     best-effort; read on consumer mount).
 *
 * A module-level shared state + listener set keeps every mounted consumer
 * (the App-level scheduler hook AND the settings/UI steppers) in lock-step
 * without a full store, so a change re-syncs the scheduled reminders
 * immediately even though the scheduler itself is mounted at the root.
 *
 * `offsetMin = 0` while enabled means "reminder exactly at the session start
 * time" — still a scheduled local notification (inexact alarm), just with no
 * lead time. `enabled = false` schedules nothing at all.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 0 is a valid lead time: the reminder fires at the session's start. */
export const MIN_SESSION_REMINDER_MINUTES = 0;
export const MAX_SESSION_REMINDER_MINUTES = 120;
/** Step used by the ± steppers everywhere the value is edited. */
export const SESSION_REMINDER_STEP = 5;
/** Feature toggle default: reminders ON for anyone with a booked session. */
export const DEFAULT_SESSION_REMINDERS_ENABLED = true;
/**
 * Default lead time is 0 — the reminder fires exactly AT the session start
 * time. That preserves the previous "start-anchored" notification behaviour
 * the user asked for, while the stepper still lets them move it earlier.
 */
export const DEFAULT_SESSION_REMINDER_MINUTES = 0;

const OFFSET_KEY = "@sessionReminderOffsetMin";
const ENABLED_KEY = "@sessionRemindersEnabled";
const FIRESTORE_OFFSET_FIELD = "sessionReminderOffsetMin";
const FIRESTORE_ENABLED_FIELD = "sessionRemindersEnabled";

// ---------------------------------------------------------------------------
// Module-level shared store
// ---------------------------------------------------------------------------

interface SessionReminderState {
  enabled: boolean;
  minutes: number;
}

let cachedState: SessionReminderState = {
  enabled: DEFAULT_SESSION_REMINDERS_ENABLED,
  minutes: DEFAULT_SESSION_REMINDER_MINUTES,
};
let coldValueHydrated = false;
const listeners = new Set<(state: SessionReminderState) => void>();

const clampMinutes = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_SESSION_REMINDER_MINUTES;
  return Math.min(
    MAX_SESSION_REMINDER_MINUTES,
    Math.max(MIN_SESSION_REMINDER_MINUTES, Math.round(value)),
  );
};

type Unsubscribe = () => void;

function subscribeReminderState(
  listener: (state: SessionReminderState) => void,
): Unsubscribe {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyReminderState(): void {
  // Same object identity per emission so React effects keying off the state
  // value still re-fire on every change (consumers destructure primitives).
  for (const listener of listeners) listener({ ...cachedState });
}

// ---------------------------------------------------------------------------
// Persistence (sync + async halves)
// ---------------------------------------------------------------------------

function readStoredMinutes(): number {
  const raw = storage.getString(OFFSET_KEY);
  if (!raw) return DEFAULT_SESSION_REMINDER_MINUTES;
  return clampMinutes(parseInt(raw, 10));
}

function readStoredEnabled(): boolean {
  // Absent key → feature default (on); stored JSON-ish values mirror the
  // app's generic storage helpers without dragging storageGet in.
  const raw = storage.getString(ENABLED_KEY);
  if (raw === undefined) return DEFAULT_SESSION_REMINDERS_ENABLED;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return DEFAULT_SESSION_REMINDERS_ENABLED;
}

function persistLocal(state: SessionReminderState): void {
  storage.set(OFFSET_KEY, String(state.minutes));
  storage.set(ENABLED_KEY, state.enabled ? "true" : "false");
}

/** Best-effort cloud write so other devices pick the same reminder setup. */
function persistRemote(state: SessionReminderState, userId?: string): void {
  const uid = userId ?? auth().currentUser?.uid;
  if (!uid) return;
  void setDoc(
    doc(firestore(), "users", uid),
    {
      [FIRESTORE_OFFSET_FIELD]: state.minutes,
      [FIRESTORE_ENABLED_FIELD]: state.enabled,
    },
    { merge: true },
  ).catch((error) => logger.warn("[sessionReminders] Cloud-sync failed:", error));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseSessionReminderOffsetResult {
  /** Whether local session reminders are on at all. */
  remindersEnabled: boolean;
  /** Current lead time in minutes — identical across every consumer. 0 = at start. */
  reminderMinutes: number;
  /** Clamps + persists (MMKV + Firestore) and notifies all consumers. */
  updateReminderMinutes: (minutes: number) => void;
  /** Toggles the feature and notifies all consumers (scheduler included). */
  updateRemindersEnabled: (enabled: boolean) => void;
}

export function useSessionReminderOffset(): UseSessionReminderOffsetResult {
  const [state, setState] = useState<SessionReminderState>(() => cachedState);

  // Hydrate the cold value from MMKV once, then keep every consumer riding
  // the shared value (handles mounts that happen after a remote pull too).
  useEffect(() => {
    if (!coldValueHydrated) {
      coldValueHydrated = true;
      cachedState = {
        enabled: readStoredEnabled(),
        minutes: readStoredMinutes(),
      };
      notifyReminderState();
    }
    setState({ ...cachedState });
    return subscribeReminderState(setState);
  }, []);

  // Cloud pull on mount: a device created after another one changed the
  // preference inherits the stored settings instead of the defaults. Absence
  // of the fields (user never customized them) leaves local values untouched.
  useEffect(() => {
    let cancelled = false;

    const uid = auth().currentUser?.uid;
    if (!uid || !coldValueHydrated) return;

    void (async (): Promise<void> => {
      try {
        const snapshot = await getDoc(doc(firestore(), "users", uid));
        if (cancelled || !snapshot.exists()) return;
        const remoteMinutes = snapshot.get(FIRESTORE_OFFSET_FIELD);
        const remoteEnabled = snapshot.get(FIRESTORE_ENABLED_FIELD);

        let changed = false;
        if (typeof remoteMinutes === "number") {
          const clamped = clampMinutes(remoteMinutes);
          if (clamped !== cachedState.minutes) {
            cachedState = { ...cachedState, minutes: clamped };
            persistLocal(cachedState);
            changed = true;
          }
        }
        if (typeof remoteEnabled === "boolean" && remoteEnabled !== cachedState.enabled) {
          cachedState = { ...cachedState, enabled: remoteEnabled };
          persistLocal(cachedState);
          changed = true;
        }
        if (changed) notifyReminderState();
      } catch (error) {
        logger.warn("[sessionReminders] Cloud-pull failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateReminderMinutes = useCallback((minutes: number): void => {
    const clamped = clampMinutes(minutes);
    if (clamped === cachedState.minutes) return;
    const next: SessionReminderState = { ...cachedState, minutes: clamped };
    persistLocal(next);
    cachedState = next;
    notifyReminderState();
    persistRemote(next);
  }, []);

  const updateRemindersEnabled = useCallback((enabled: boolean): void => {
    if (enabled === cachedState.enabled) return;
    const next: SessionReminderState = { ...cachedState, enabled };
    persistLocal(next);
    cachedState = next;
    notifyReminderState();
    persistRemote(next);
  }, []);

  return {
    remindersEnabled: state.enabled,
    reminderMinutes: state.minutes,
    updateReminderMinutes,
    updateRemindersEnabled,
  };
}
