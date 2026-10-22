/**
 * The glue between the user's library statistics and the gamification rules.
 *
 * The statistics are read in one place (`services/userStatsService`) and the
 * rules live in one place (`@gaming-zone/utils`); this module is what turns
 * one into the other, so the mapping exists exactly once.
 */
import type { GamificationStats } from "@gaming-zone/core";
import { useGamificationStore } from "@/src/store/useGamificationStore";
import type { UserStats } from "./userStatsService";

/**
 * A number that is safe to do arithmetic with.
 *
 * The statistics can come from a cache that predates a counter, and a
 * missing counter would put `undefined` into the XP arithmetic — where
 * `Math.max(NaN, x)` is `NaN`, so it would stick to the high-water mark.
 */
function counter(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * The raw counters the gamification rules are computed from.
 *
 * Note what is *not* here: the "rated" list the rating flow mirrors ratings
 * into. It is excluded from `trackedCount`, so rating a game and tracking it
 * stay two separate XP sources.
 */
export function toGamificationStats(stats: UserStats): GamificationStats {
  return {
    ratedCount: counter(stats.ratedCount),
    fiveStarCount: counter(stats.fiveStarCount),
    playedCount: counter(stats.counts?.played),
    trackedCount: counter(stats.trackedCount),
    playtimeHours: counter(stats.playtimeHours),
  };
}

/**
 * Folds the current counters into the XP/level ratchet.
 *
 * This runs whenever the counters change, wherever they were read from, so
 * the ratchet is never stale — and a level-up is raised as soon as the
 * authoritative derivation says the user crossed a threshold.
 */
export function syncGamification(uid: string, stats: UserStats): void {
  if (!uid) return;
  useGamificationStore.getState().sync(uid, toGamificationStats(stats));
}