/**
 * The shared cache for a user's library statistics.
 *
 * The statistics are read from Firestore exactly once per refresh and shared
 * by every consumer: the profile screen (`useUserStats`) and the gamification
 * system (`useGamification`) both read from this store, so the list and
 * rating subcollections are never fetched twice for the same user.
 */
import { create } from "zustand";
import { storageGet, storageSet } from "@/src/lib/storage";
import {
  emptyUserStats,
  normalizeUserStats,
  readUserStats,
  type UserStats,
} from "@/src/services/userStatsService";
import { syncGamification } from "@/src/services/gamificationService";
import { logger } from "@/src/lib/logger";

interface UserStatsEntry {
  stats: UserStats | null;
  loading: boolean;
  refreshing: boolean;
}

interface UserStatsState {
  byUid: Record<string, UserStatsEntry>;
  /** Loads the user once; later calls are no-ops until `refresh`. */
  ensureLoaded: (uid: string) => Promise<void>;
  /**
   * Re-reads the statistics from Firestore.
   *
   * `quiet` refreshes (the profile screen does one on every focus) leave the
   * `refreshing` flag down, so the pull-to-refresh spinner does not flash on
   * a screen the user merely came back to.
   */
  refresh: (uid: string, quiet?: boolean) => Promise<void>;
}

const statsCacheKey = (uid: string): string => `USER_STATS_${uid}`;

/** In-flight reads, so two consumers never fetch the same user twice. */
const inFlight = new Map<string, Promise<void>>();

export const useUserStatsStore = create<UserStatsState>()((set, get) => ({
  byUid: {},

  ensureLoaded: async (uid: string) => {
    if (!uid) return;
    const existing = get().byUid[uid];
    if (existing?.stats) return;

    // Seed from the MMKV cache so a cold open paints instantly, then refresh
    // in the background. The cache is normalised first: it can predate a
    // counter, and a missing counter would put `undefined` into the XP
    // arithmetic.
    const cached = normalizeUserStats(storageGet(statsCacheKey(uid)));
    if (cached) {
      set((state) => ({
        byUid: {
          ...state.byUid,
          [uid]: { stats: cached, loading: false, refreshing: false },
        },
      }));
      // Fold the cached counters into the XP ratchet right away, so the
      // level is already correct on the first paint.
      syncGamification(uid, cached);
    }

    await get().refresh(uid);
  },

  refresh: async (uid: string, quiet = false) => {
    if (!uid) return;

    const pending = inFlight.get(uid);
    if (pending) return pending;

    const entry = get().byUid[uid];
    set((state) => ({
      byUid: {
        ...state.byUid,
        [uid]: {
          stats: entry?.stats ?? null,
          loading: entry?.stats == null,
          refreshing: quiet ? false : entry?.stats != null,
        },
      },
    }));

    const request = (async () => {
      try {
        const stats = await readUserStats(uid);
        storageSet(statsCacheKey(uid), stats);
        set((state) => ({
          byUid: {
            ...state.byUid,
            [uid]: { stats, loading: false, refreshing: false },
          },
        }));
        // The counters moved, so the XP ratchet is folded again. This is the
        // only place a level-up is raised, which is what keeps it accurate:
        // the derivation runs on real numbers, never on a guess.
        syncGamification(uid, stats);
      } catch (error) {
        logger.error("[useUserStatsStore] Error reading user stats:", error);
        set((state) => ({
          byUid: {
            ...state.byUid,
            [uid]: {
              stats: entry?.stats ?? emptyUserStats(),
              loading: false,
              refreshing: false,
            },
          },
        }));
      } finally {
        inFlight.delete(uid);
      }
    })();

    inFlight.set(uid, request);
    return request;
  },
}));

/**
 * Reads the cached statistics for a user without subscribing to them.
 * Non-React code (the gamification store) uses this.
 */
export function getCachedUserStats(uid: string): UserStats | null {
  return useUserStatsStore.getState().byUid[uid]?.stats ?? null;
}

/**
 * Re-reads the shared statistics in the background.
 *
 * Call this after something moved the counters — a rating, a game added to or
 * removed from a list — so the XP those counters justify is granted without
 * waiting for the user to open their profile.
 */
export function refreshUserStats(uid: string): void {
  if (!uid) return;
  void useUserStatsStore.getState().refresh(uid, true);
}
