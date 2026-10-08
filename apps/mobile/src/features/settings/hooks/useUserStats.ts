import { useCallback, useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { storageGet, storageSet } from "@/src/lib/storage";
import type { GameEntry } from "@/src/features/lists/types";

export interface UserStats {
  counts: {
    playing: number;
    played: number;
    wantToPlay: number;
    totalUnique: number;
  };
  ratedCount: number;
  averageRating: number | null;
  playtimeHours: number;
  highestRated: GameEntry[];
}

const statsCacheKey = (uid: string): string => `USER_STATS_${uid}`;

const emptyStats = (): UserStats => ({
  counts: { playing: 0, played: 0, wantToPlay: 0, totalUnique: 0 },
  ratedCount: 0,
  averageRating: null,
  playtimeHours: 0,
  highestRated: [],
});

/**
 * Derives the profile statistics live from the user's list and rating
 * subcollections. Reads are kept linear: a single pass per list plus a pass
 * over the ratings collection, with no per-game enrichment. Results are
 * cached to MMKV so a cold open paints instantly, and `refresh()` is called
 * on focus to keep the numbers current.
 *
 * NOTE: computed client-side on purpose. If a user's library grows large
 * enough that full subcollection reads become expensive, this should move to
 * a Cloud Function maintaining a `users/{uid}/stats` document instead.
 */
export function useUserStats(uid: string) {
  const [stats, setStats] = useState<UserStats | null>(() =>
    storageGet<UserStats>(statsCacheKey(uid)),
  );
  const [loading, setLoading] = useState<boolean>(stats === null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const applyResult = useCallback(
    (result: UserStats, mounted: () => boolean = () => true) => {
      if (!mounted()) return;
      setStats(result);
      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  const fetchStats = useCallback(async (): Promise<UserStats> => {
    const result: UserStats = emptyStats();
    const db = firestore();
    const userRef = db.collection("users").doc(uid);

    const seen = new Set<string>();
    const playtimeSeen = new Set<string>();
    let playtimeMinutes = 0;
    const ratedEntries = new Map<string, GameEntry>();

    let listIds: string[] = [];
    try {
      const listsSnap = await userRef.collection("lists").get();
      listIds = listsSnap.docs.map((d) => d.id);
    } catch (error) {
      console.error("[useUserStats] Error reading list docs:", error);
    }

    // Fall back to the default lists if the lists subcollection read failed.
    if (listIds.length === 0) listIds = ["playing", "played", "wantToPlay"];

    await Promise.all(
      listIds.map(async (listId) => {
        try {
          const gamesSnap = await userRef
            .collection("lists")
            .doc(listId)
            .collection("games")
            .get();

          for (const doc of gamesSnap.docs) {
            const data = doc.data();
            const gameId = String(data.id ?? doc.id);
            seen.add(gameId);

            if (listId === "playing") result.counts.playing++;
            else if (listId === "played") result.counts.played++;
            else if (listId === "wantToPlay") result.counts.wantToPlay++;

            // Steam playtime is tracked on the played/playing entries only.
            if (
              (listId === "playing" || listId === "played") &&
              typeof data.steamPlaytimeForever === "number"
            ) {
              if (!playtimeSeen.has(gameId)) {
                playtimeSeen.add(gameId);
                playtimeMinutes += data.steamPlaytimeForever;
              }
            }

            const rating =
              typeof data.rating === "number" && data.rating > 0
                ? data.rating
                : undefined;
            if (rating !== undefined) {
              ratedEntries.set(gameId, {
                id: data.id ?? doc.id,
                name:
                  typeof data.name === "string" && data.name
                    ? data.name
                    : String(data.id ?? ""),
                cover_image_id: data.cover_image_id ?? null,
                rating,
              });
            }
          }
        } catch (error) {
          console.error(`[useUserStats] Error reading list "${listId}":`, error);
        }
      }),
    );

    // Ratings collection: authoritative count + average.
    try {
      const ratingsSnap = await userRef.collection("ratings").get();
      let sum = 0;
      for (const doc of ratingsSnap.docs) {
        const rating = doc.data().rating;
        if (typeof rating !== "number" || rating <= 0) continue;
        seen.add(doc.id);
        sum += rating;
        result.ratedCount++;
      }
      result.averageRating =
        result.ratedCount > 0 ? Math.round((sum / result.ratedCount) * 10) / 10 : null;
    } catch (error) {
      console.error("[useUserStats] Error reading ratings:", error);
    }

    result.counts.totalUnique = seen.size;
    result.playtimeHours = Math.round((playtimeMinutes / 60) * 10) / 10;
    result.highestRated = Array.from(ratedEntries.values())
      .filter((entry) => entry.cover_image_id != null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3);

    storageSet(statsCacheKey(uid), result);
    return result;
  }, [uid]);

  useEffect(() => {
    let mounted = true;
    fetchStats().then((result) => applyResult(result, () => mounted));
    return () => {
      mounted = false;
    };
  }, [fetchStats, applyResult]);

  const refresh = useCallback(
    (quiet = false): Promise<void> => {
      if (!quiet) setRefreshing(true);
      return fetchStats().then((result) => applyResult(result));
    },
    [fetchStats, applyResult],
  );

  return { stats, loading, refreshing, refresh };
}
