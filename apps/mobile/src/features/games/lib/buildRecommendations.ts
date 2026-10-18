import firestore from "@react-native-firebase/firestore";
import { fetchGamesByIds } from "@/src/services/api/igdbApi";
import type { Game } from "@/src/types/sharedTypes";
import {
  collectGameSignals,
  filterByUserPlatform,
  pickDiverseRecommendations,
  rankRecommendations,
} from "./recommendationScoring";

/**
 * Builds the "recommended for you" rail from the user's library.
 *
 * The ranking rules are pure and live in `./recommendationScoring`; this module
 * owns the Firestore read and the two API requests that feed them.
 */

/** How many of the user's most-played games drive the signals. */
const TOP_GAMES_SAMPLE_SIZE = 10;

/** Cap on how many implied games are fetched for scoring. */
const CANDIDATE_FETCH_LIMIT = 40;

/** A game document under `users/{uid}/lists/{list}/games`. */
export type UserListGameDoc = {
  id: number;
  steamPlaytimeForever?: number;
  addedAt?: { toMillis?: () => number };
};

/** The ids held in each of the user's lists. */
export type OwnedGameIds = {
  playing: Set<number>;
  played: Set<number>;
  wantToPlay: Set<number>;
};

export type Recommendations = {
  games: Game[];
  basedOnGenre: string | null;
};

/** Most played first, then most recently added. Does not mutate its input. */
function sortByPlaytimeThenAddedAt(games: UserListGameDoc[]): UserListGameDoc[] {
  return [...games].sort((a, b) => {
    const playtimeDiff =
      (b.steamPlaytimeForever ?? 0) - (a.steamPlaytimeForever ?? 0);
    if (playtimeDiff !== 0) return playtimeDiff;

    return (b.addedAt?.toMillis?.() ?? 0) - (a.addedAt?.toMillis?.() ?? 0);
  });
}

/**
 * Ranks similar games of the user's most-played titles against their platform
 * preference, returning `basedOnGenre` for the rail's subtitle.
 */
export async function buildRecommendations(
  uid: string,
  ownedIds: OwnedGameIds,
  allUserGames: UserListGameDoc[],
): Promise<Recommendations> {
  const db = firestore();

  const userDoc = await db.collection("users").doc(uid).get();
  let userPlatform: string | null = null;
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data?.platform) userPlatform = String(data.platform).toLowerCase();
  }

  const ownedGameIds = new Set<number>([
    ...ownedIds.playing,
    ...ownedIds.played,
    ...ownedIds.wantToPlay,
  ]);

  if (allUserGames.length === 0) return { games: [], basedOnGenre: null };

  const topGameIds = sortByPlaytimeThenAddedAt(allUserGames)
    .slice(0, TOP_GAMES_SAMPLE_SIZE)
    .map((game) => game.id);

  // Fetch all top games in ONE batched request. The old code fired up to 10
  // parallel requests to the GamingZone backend, which on low-end hardware
  // (combined with the rest of the Home-screen burst) starved the main thread
  // and caused input-dispatch ANRs. Top-game order is preserved for weighting.
  const topGames = await fetchGamesByIds(topGameIds);
  const topGamesById = new Map<number, Game>(
    topGames.map((game) => [game.id, game]),
  );

  const { ids, weights, topGenres } = collectGameSignals(
    topGameIds,
    topGamesById,
    ownedGameIds,
  );

  if (ids.size === 0) return { games: [], basedOnGenre: null };

  const rankedIds = Array.from(ids)
    .sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0))
    .slice(0, CANDIDATE_FETCH_LIMIT);

  const candidates = filterByUserPlatform(
    await fetchGamesByIds(rankedIds),
    userPlatform,
  );

  return {
    games: pickDiverseRecommendations(
      rankRecommendations(candidates, topGenres, weights),
    ),
    basedOnGenre: topGenres[0] ?? null,
  };
}
