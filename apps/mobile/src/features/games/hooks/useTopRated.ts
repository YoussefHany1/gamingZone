import { useSectionFeed } from "./useSectionFeed";
import { fetchTopRatedGames } from "@/src/services/api/igdbApi";

/**
 * The cache key for the top-rated feed section.
 *
 * Load-bearing: byte-identical to the value the legacy section used, so a
 * warm cache survives the migration (docs/refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "GAMES_CACHE_TOP_RATED";

/** Top rated games for the games feed's `top_rated` section. */
export function useTopRated() {
  return useSectionFeed(STORAGE_KEY, fetchTopRatedGames);
}
