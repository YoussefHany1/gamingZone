/**
 * Reads a user's library statistics from Firestore.
 *
 * This module owns the *only* Firestore reads behind the profile statistics
 * and the gamification system. Both consumers go through the shared cache in
 * `store/useUserStatsStore.ts`, so the list and rating subcollections are
 * never read twice for the same user.
 */
import firestore from "@react-native-firebase/firestore";
import type { GameEntry } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";

export interface UserStats {
  counts: {
    playing: number;
    played: number;
    wantToPlay: number;
    totalUnique: number;
  };
  ratedCount: number;
  /** Ratings the user gave five stars. */
  fiveStarCount: number;
  /**
   * Games tracked in the user's *own* lists. The auto-mirrored "rated" list is
   * excluded, so a game the user only rated is not counted as a tracked game
   * as well — the XP rules treat "rating" and "tracking" as separate actions.
   */
  trackedCount: number;
  averageRating: number | null;
  playtimeHours: number;
  highestRated: GameEntry[];
}

/** The list the rating flow mirrors ratings into. It is not a user list. */
const MIRRORED_LIST_ID = "rated";

export const emptyUserStats = (): UserStats => ({
  counts: { playing: 0, played: 0, wantToPlay: 0, totalUnique: 0 },
  ratedCount: 0,
  fiveStarCount: 0,
  trackedCount: 0,
  averageRating: null,
  playtimeHours: 0,
  highestRated: [],
});

/** A number that is safe to do arithmetic with. */
const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Brings a cached statistics object up to the current shape.
 *
 * The cache lives in MMKV under a stable key, so it outlives the app version
 * that wrote it: a cache written before a counter existed has no value for
 * it at all. Reading such an object as-is would put `undefined` into the XP
 * arithmetic, and `Math.max(NaN, x)` is `NaN` — which would then stick to
 * the high-water mark. Missing counters are therefore filled in with zero,
 * and the next refresh replaces the whole object anyway.
 */
export function normalizeUserStats(value: unknown): UserStats | null {
  if (!value || typeof value !== "object") return null;
  const cached = value as Partial<UserStats> & {
    counts?: Partial<UserStats["counts"]>;
  };
  const counts: Partial<UserStats["counts"]> = cached.counts ?? {};

  return {
    counts: {
      playing: num(counts.playing),
      played: num(counts.played),
      wantToPlay: num(counts.wantToPlay),
      totalUnique: num(counts.totalUnique),
    },
    ratedCount: num(cached.ratedCount),
    fiveStarCount: num(cached.fiveStarCount),
    trackedCount: num(cached.trackedCount),
    averageRating:
      typeof cached.averageRating === "number" &&
      Number.isFinite(cached.averageRating)
        ? cached.averageRating
        : null,
    playtimeHours: num(cached.playtimeHours),
    highestRated: Array.isArray(cached.highestRated) ? cached.highestRated : [],
  };
}

/**
 * Derives the profile statistics live from the user's list and rating
 * subcollections. Reads are kept linear: a single pass per list plus a pass
 * over the ratings collection, with no per-game enrichment.
 *
 * NOTE: computed client-side on purpose. If a user's library grows large
 * enough that full subcollection reads become expensive, this should move to
 * a Cloud Function maintaining a `users/{uid}/stats` document instead.
 */
export async function readUserStats(uid: string): Promise<UserStats> {
  const result: UserStats = emptyUserStats();
  const db = firestore();
  const userRef = db.collection("users").doc(uid);

  const seen = new Set<string>();
  const tracked = new Set<string>();
  const playtimeSeen = new Set<string>();
  let playtimeMinutes = 0;
  const ratedEntries = new Map<string, GameEntry>();

  let listIds: string[] = [];
  try {
    const listsSnap = await userRef.collection("lists").get();
    listIds = listsSnap.docs.map((d) => d.id);
  } catch (error) {
    logger.error("[readUserStats] Error reading list docs:", error);
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

          // The "rated" list is written by the rating flow, not by the user,
          // so it does not count as a tracked game.
          if (listId !== MIRRORED_LIST_ID) tracked.add(gameId);

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
        logger.error(`[readUserStats] Error reading list "${listId}":`, error);
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
      if (rating === 5) result.fiveStarCount++;
    }
    result.averageRating =
      result.ratedCount > 0 ? Math.round((sum / result.ratedCount) * 10) / 10 : null;
  } catch (error) {
    logger.error("[readUserStats] Error reading ratings:", error);
  }

  result.counts.totalUnique = seen.size;
  result.trackedCount = tracked.size;
  result.playtimeHours = Math.round((playtimeMinutes / 60) * 10) / 10;
  result.highestRated = Array.from(ratedEntries.values())
    .filter((entry) => entry.cover_image_id != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);

  return result;
}
