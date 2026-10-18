import type { Game } from "@/src/types/sharedTypes";

/**
 * Cache policy for the recommended-games rail.
 *
 * Deliberately free of React, Firestore and MMKV imports: the rules below are
 * pure, so they can be unit-tested without the native storage module. The
 * read/write itself goes through the app-wide store in `@/src/lib/storage`
 * (the rail used to keep its own second MMKV instance for this one key).
 */

/** MMKV key holding the serialised `CachedRecommendations`. */
export const RECOMMENDED_GAMES_CACHE_KEY = "recommended_games_v1";

/** How long a built recommendation set is considered current. */
export const RECOMMENDED_GAMES_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** The game ids held in each of the three library lists. */
export type RecommendedGamesListIds = {
  playing: number[];
  played: number[];
  wantToPlay: number[];
};

export type CachedRecommendations = {
  games: Game[];
  basedOnGenre: string | null;
  fetchedAt: number;
  /** The library state these recommendations were built from. */
  listsHash: string;
};

/**
 * Order-insensitive hash of the three lists. Reordering a list must not be
 * treated as a change, so each list is sorted before it is joined.
 */
export function recommendedGamesListHash(ids: RecommendedGamesListIds): string {
  const sorted = (list: number[]): string =>
    [...list].sort((a, b) => a - b).join(",");

  return `${sorted(ids.playing)}|${sorted(ids.played)}|${sorted(ids.wantToPlay)}`;
}

/**
 * True when `cached` was built from the same library state and is still inside
 * the TTL — i.e. the rail can be served without touching the network.
 */
export function isRecommendedGamesCacheFresh(
  cached: CachedRecommendations | null,
  listsHash: string,
  now: number,
): cached is CachedRecommendations {
  return (
    cached !== null &&
    cached.listsHash === listsHash &&
    now - cached.fetchedAt < RECOMMENDED_GAMES_TTL_MS
  );
}
