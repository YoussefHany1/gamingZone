import * as Notifications from "expo-notifications";
import i18n from "@/src/i18n";
import { logger } from "@/src/lib/logger";
import type { PlaySession } from "../hooks/usePlaySessions";

/**
 * sessionReminderScheduler.ts — local scheduled reminders for confirmed play
 * sessions.
 *
 * Design notes:
 *   - Reminders live entirely on-device via expo-notifications "scheduled local
 *     notifications". The backend FCM reminder cron was retired in favour of
 *     this: local scheduling is device-precise and the offset is user-tunable
 *     (5–120 minutes, default 30), which the fixed hourly server windows
 *     could never support.
 *   - The trigger is a plain `{ type: "date" }` input — an *inexact* alarm on
 *     Android 12+. A few seconds of drift is fine for a game session and lets
 *     us skip the `SCHEDULE_EXACT_ALARM` permission entirely (no Play review
 *     risk, no extra native build).
 *   - One stable notification id per session
 *     (`session-reminder-{sessionId}`) makes the sync idempotent: rebooting
 *     the device (which clears scheduled notifications) simply restores the
 *     whole set on the next app launch, and repeated syncs never duplicate.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Android channel for session reminders — independent OS-level control. */
export const SESSION_REMINDERS_CHANNEL_ID = "session_reminders" as const;

/** Identifies reminder-driven notifications when the user taps one. */
export const SESSION_REMINDER_DATA_TYPE = "session_reminder" as const;

const REMINDER_ID_PREFIX = "session-reminder-" as const;
const MINUTE_MS = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A reminder time (ms) kept only for reminder-prefixed scheduled notifications. */
type PendingReminders = Map<string, { triggerMs: number; content: Notifications.NotificationContentInput }>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildReminderId(sessionId: string): string {
  return `${REMINDER_ID_PREFIX}${sessionId}`;
}

function isReminderNotification(identifier: string): boolean {
  return identifier.startsWith(REMINDER_ID_PREFIX);
}

/** A session is reminder-eligible when confirmed with a usable future start. */
export function isSessionReminderEligible(session: PlaySession): boolean {
  return (
    session.status === "confirmed" &&
    typeof session.startsAt === "number" &&
    Number.isFinite(session.startsAt)
  );
}

/**
 * Notification body is assembled at *schedule* time, so it must not use
 * relative time ("in 30 minutes") — the text stays frozen while the world
 * moves on. An absolute clock time stays correct no matter when it fires.
 */
function buildReminderContent(session: PlaySession): Notifications.NotificationContentInput {
  const startsAt = session.startsAt as number;
  const startsAtTime = new Date(startsAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    title: i18n.t("social.sessions.reminder.notificationTitle", { gameName: session.gameName }),
    body: i18n.t("social.sessions.reminder.notificationBody", { time: startsAtTime }),
    sound: "default",
    // Matching the FCM foreground-presentation convention: on Android this
    // selects the (locally created) channel by the same id.
    categoryIdentifier: SESSION_REMINDERS_CHANNEL_ID,
    data: {
      type: SESSION_REMINDER_DATA_TYPE,
      sessionId: session.id,
      conversationId: session.conversationId,
      startsAt,
    },
  };
}

/** Reads the raw trigger date out of a scheduled notification defensively. */
function getTriggerMs(trigger: unknown): number | null {
  const date = (trigger as { date?: number | Date } | null | undefined)?.date;
  if (typeof date === "number" && Number.isFinite(date)) return date;
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.getTime();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function cancelOneSessionReminder(sessionId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(buildReminderId(sessionId));
  } catch (error) {
    // Absent ids throw on some platforms — a no-op is the correct outcome.
    logger.debug("[sessionReminders] Nothing to cancel for a session:", error);
  }
}

export async function cancelAllSessionReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => isReminderNotification(item.identifier))
        .map((item) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier).catch((error) => {
            logger.warn("[sessionReminders] Failed to cancel a reminder:", error);
          }),
        ),
    );
  } catch (error) {
    logger.warn("[sessionReminders] Failed to list scheduled reminders:", error);
  }
}

/**
 * Reconciles the OS-scheduled reminders with the sessions the user is actually
 * in. Called on every Firestore snapshot (and on offset/toggle changes), so it
 * must be a cheap diff rather than a blind reset:
 *   - cancel: session gone / cancelled / lead time already passed
 *   - reschedule: trigger time moved (startsAt, offset or toggle changed)
 *   - schedule: new confirmed session with a future reminder window
 *
 * `enabled = false` cancels every reminder. `offsetMin = 0` while enabled
 * schedules the reminder *exactly at the session's start time*; a plain Date
 * trigger stays an inexact alarm on Android 12+ (seconds of drift at most) —
 * no SCHEDULE_EXACT_ALARM permission and no Play review risk.
 */
export async function syncSessionReminders(
  sessions: PlaySession[],
  options: { enabled: boolean; offsetMin: number },
): Promise<void> {
  const { enabled, offsetMin } = options;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    // Build the desired set (id → trigger/content).
    const desired: PendingReminders = new Map();
    if (enabled && offsetMin >= 0) {
      for (const session of sessions) {
        if (!isSessionReminderEligible(session)) continue;
        const startsAt = session.startsAt as number;
        const triggerMs = startsAt - offsetMin * MINUTE_MS;
        // Stale-window guard: if the app resumes after the reminder should
        // have fired, surface nothing retroactively — the session may still
        // be upcoming, but a "you start soon" alert already in the past is
        // noise (this is what also keeps toggling off + back on clean).
        if (triggerMs <= Date.now()) continue;
        desired.set(buildReminderId(session.id), {
          triggerMs,
          content: buildReminderContent(session),
        });
      }
    }

    // Diff against what the OS still holds.
    const operations: Promise<unknown>[] = [];
    for (const item of scheduled) {
      if (!isReminderNotification(item.identifier)) continue;
      const pending = desired.get(item.identifier);
      if (!pending) {
        desired.delete(item.identifier);
        operations.push(
          Notifications.cancelScheduledNotificationAsync(item.identifier).catch((error) => {
            logger.warn("[sessionReminders] Failed to cancel a stale reminder:", error);
          }),
        );
        continue;
      }
      const currentMs = getTriggerMs(item.trigger);
      // Within 30s → same fire time; keep the OS entry untouched instead of
      // churning cancel+schedule on every unrelated snapshot update.
      if (currentMs !== null && Math.abs(currentMs - pending.triggerMs) < 30_000) {
        desired.delete(item.identifier);
      }
    }

    for (const [identifier, { triggerMs, content }] of desired) {
      const triggerDate = new Date(triggerMs);
      operations.push(
        // Plain Date trigger = inexact alarm on Android 12+ (seconds of drift
        // at most) — avoids the SCHEDULE_EXACT_ALARM permission entirely.
        Notifications.scheduleNotificationAsync({
          identifier,
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        }).catch((error) => {
          logger.warn("[sessionReminders] Failed to schedule a reminder:", error);
        }),
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
      logger.debug(
        `[sessionReminders] Synced scheduled reminders (changes: ${operations.length}).`,
      );
    }
  } catch (error) {
    logger.warn("[sessionReminders] Reminder sync failed:", error);
  }
}
