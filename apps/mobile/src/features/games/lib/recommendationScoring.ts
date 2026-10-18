import type { Game } from "@/src/types/sharedTypes";

/**
 * Pure ranking rules behind the recommended-games rail.
 *
 * Split out of the hook so the scoring arithmetic — which used to live inline as
 * `(game as any)._smartScore` — can be read and tested on its own. These
 * functions never mutate their inputs.
 */

/** IGDB `category` 0 means a base game; any other value is an add-on. */
const BASE_GAME_CATEGORY = 0;

/** Weight of the most-played game; each following game weighs one less. */
const SOURCE_WEIGHT_BASE = 10;

/** Genre bonuses for the user's top three genres, in rank order. */
const GENRE_BONUSES = [15, 10, 5];

/** How many genres the ranking rewards. */
const TOP_GENRE_COUNT = 3;

/** Score assumed for a game IGDB has not rated yet. */
const UNRATED_SCORE = 50;

/** Multiplier applied to a candidate's similar-game weight. */
const SIMILAR_GAME_MULTIPLIER = 2;

/** A candidate must reach this score to be recommended. */
const MIN_RECOMMENDATION_SCORE = 60;

/** Strongest candidates kept before the diversity shuffle. */
const SHUFFLE_POOL_SIZE = 20;

/** How many recommendations the rail receives. */
export const RECOMMENDATION_COUNT = 10;

/** Similar-game id → accumulated weight across the user's top games. */
export type SimilarGameWeights = Record<number, number>;

export type GameSignals = {
  /** Candidate ids implied by the user's top games, deduplicated. */
  ids: Set<number>;
  /** How strongly each candidate was implied. */
  weights: SimilarGameWeights;
  /** The genres the user plays most, most frequent first (max 3). */
  topGenres: string[];
};

/**
 * Turns the user's most-played games into two signals: which other games they
 * imply (weighted so earlier entries count for more) and which genres the user
 * gravitates to. Games already in a library are excluded from the candidates.
 */
export function collectGameSignals(
  topGameIds: number[],
  gamesById: Map<number, Game>,
  ownedGameIds: Set<number>,
): GameSignals {
  const ids = new Set<number>();
  const weights: SimilarGameWeights = {};
  const genreCounts: Record<string, number> = {};

  topGameIds.forEach((id, index) => {
    const details = gamesById.get(id);
    if (!details) return;

    const sourceWeight = SOURCE_WEIGHT_BASE - index;
    details.similar_games?.forEach((similar) => {
      if (ownedGameIds.has(similar.id)) return;
      ids.add(similar.id);
      weights[similar.id] = (weights[similar.id] ?? 0) + sourceWeight;
    });

    details.genres?.forEach((genre) => {
      if (genre.name) genreCounts[genre.name] = (genreCounts[genre.name] ?? 0) + 1;
    });
  });

  const topGenres = Object.keys(genreCounts)
    .sort((a, b) => (genreCounts[b] ?? 0) - (genreCounts[a] ?? 0))
    .slice(0, TOP_GENRE_COUNT);

  return { ids, weights, topGenres };
}

/**
 * Drops add-ons and anything that cannot run on the user's platform.
 *
 * The per-platform branches are written out rather than table-driven: IGDB
 * platform names are inconsistent ("PlayStation 4", "PS4", "PC (Windows)"), and
 * the matching rules genuinely differ per family.
 */
export function filterByUserPlatform(
  games: Game[],
  userPlatform: string | null,
): Game[] {
  return games.filter((game) => {
    if (game.category !== undefined && game.category !== BASE_GAME_CATEGORY) {
      return false;
    }
    if (!userPlatform) return true;
    if (!game.platforms) return false;

    if (userPlatform === "playstation") {
      return game.platforms.some(
        (platform) =>
          platform.name?.toLowerCase().includes("playstation") ||
          platform.abbreviation?.toLowerCase().includes("ps"),
      );
    }
    if (userPlatform === "xbox") {
      return game.platforms.some((platform) =>
        platform.name?.toLowerCase().includes("xbox"),
      );
    }
    if (userPlatform === "pc") {
      return game.platforms.some(
        (platform) =>
          platform.name?.toLowerCase().includes("pc") ||
          platform.name?.toLowerCase().includes("windows"),
      );
    }
    return game.platforms.some(
      (platform) =>
        platform.name?.toLowerCase().includes(userPlatform) ||
        platform.abbreviation?.toLowerCase().includes(userPlatform),
    );
  });
}

/**
 * Scores one candidate: its IGDB rating (or a neutral 50 when unrated), genre
 * affinity with the user's top genres, and how strongly it was implied by the
 * games the user plays.
 */
function scoreRecommendation(
  game: Game,
  topGenres: string[],
  weights: SimilarGameWeights,
): number {
  let score = game.total_rating || UNRATED_SCORE;

  const genreNames = game.genres?.map((genre) => genre.name) ?? [];
  topGenres.forEach((genre, index) => {
    const bonus = GENRE_BONUSES[index];
    if (bonus !== undefined && genreNames.includes(genre)) score += bonus;
  });

  return score + (weights[game.id] ?? 0) * SIMILAR_GAME_MULTIPLIER;
}

/**
 * Ranks candidates best-first and drops everything below the threshold. This
 * runs before selection so the shuffle below only reorders near-equal games.
 */
export function rankRecommendations(
  games: Game[],
  topGenres: string[],
  weights: SimilarGameWeights,
): Game[] {
  return games
    .map((game) => ({ game, score: scoreRecommendation(game, topGenres, weights) }))
    .filter((entry) => entry.score >= MIN_RECOMMENDATION_SCORE)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.game);
}

/**
 * Shuffles the strongest candidates so the rail is not identical on every
 * launch, then returns the final slice. `random` is injectable so tests can
 * assert the selection without depending on Math.random.
 */
export function pickDiverseRecommendations(
  rankedGames: Game[],
  random: () => number = Math.random,
): Game[] {
  const pool = rankedGames.slice(0, SHUFFLE_POOL_SIZE);

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  return pool.slice(0, RECOMMENDATION_COUNT);
}
