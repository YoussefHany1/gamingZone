import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUserStatsStore } from "@/src/store/useUserStatsStore";
import type { UserStats } from "@/src/services/userStatsService";

export type { UserStats };

/**
 * The signed-in user's library statistics.
 *
 * The data itself is read by `services/userStatsService` and cached in
 * `store/useUserStatsStore`, which is also what the gamification system
 * reads — so the list and rating subcollections are fetched once, not once
 * per consumer.
 */
export function useUserStats(uid: string) {
  const { stats, loading, refreshing } = useUserStatsStore(
    useShallow((state) => {
      const entry = state.byUid[uid];
      return {
        stats: entry?.stats ?? null,
        loading: entry?.loading ?? true,
        refreshing: entry?.refreshing ?? false,
      };
    }),
  );

  const ensureLoaded = useUserStatsStore((state) => state.ensureLoaded);
  const refreshStore = useUserStatsStore((state) => state.refresh);

  useEffect(() => {
    if (!uid) return;
    void ensureLoaded(uid);
  }, [uid, ensureLoaded]);

  const refresh = useCallback(
    async (quiet = false): Promise<void> => {
      if (!uid) return;
      await refreshStore(uid, quiet);
    },
    [uid, refreshStore],
  );

  return { stats, loading, refreshing, refresh };
}
