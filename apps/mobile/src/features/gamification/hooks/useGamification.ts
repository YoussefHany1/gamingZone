import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { GamificationState } from "@gaming-zone/core";
import { computeGamification } from "@gaming-zone/utils";
import { useUserStatsStore } from "@/src/store/useUserStatsStore";
import { useGamificationStore } from "@/src/store/useGamificationStore";
import { toGamificationStats } from "@/src/services/gamificationService";

/**
 * The user's level, XP and badges.
 *
 * The counters come from the shared user-stats cache, so this hook never
 * issues a Firestore read of its own — the profile screen and the gamification
 * system read the same snapshot. The ratchet that keeps XP and badges from
 * ever going down is folded in by `services/gamificationService` whenever the
 * counters change, wherever they were read from.
 */
export function useGamification(uid: string) {
  const stats = useUserStatsStore(
    useShallow((state) => state.byUid[uid]?.stats ?? null),
  );
  const entry = useGamificationStore(
    useShallow((state) => state.byUid[uid] ?? null),
  );
  const ensureLoaded = useUserStatsStore((state) => state.ensureLoaded);

  // The achievements screen can be opened without the profile having been
  // visited, so the shared cache is asked to load the counters if nobody has
  // done it yet.
  useEffect(() => {
    if (!uid) return;
    void ensureLoaded(uid);
  }, [uid, ensureLoaded]);

  const state = useMemo<GamificationState | null>(() => {
    if (!stats) return null;
    return computeGamification(toGamificationStats(stats), {
      // The high-water mark, so the level never drops below what the user
      // already earned.
      bankedXp: entry?.totalXp ?? 0,
      unlockedAchievementIds: entry?.unlockedAchievementIds ?? [],
    });
  }, [stats, entry?.totalXp, entry?.unlockedAchievementIds]);

  return {
    gamification: state,
    /** The XP toast waiting to be shown, if any. */
    toast: entry?.toast ?? null,
    /** The level-up celebration waiting to be shown, if any. */
    levelUp: entry?.levelUp ?? null,
  };
}
