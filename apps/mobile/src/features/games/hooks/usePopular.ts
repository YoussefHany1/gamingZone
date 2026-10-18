import { useSectionFeed } from "./useSectionFeed";
import { fetchPopularGames } from "@/src/services/api/igdbApi";

/**
 * The cache key for the popular feed section.
 *
 * Load-bearing: byte-identical to the value the legacy section used, so a
 * warm cache survives the migration (docs/refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "GAMES_CACHE_POPULAR";

/** Popular games for the games feed's `popular` section. */
export function usePopular() {
  return useSectionFeed(STORAGE_KEY, fetchPopularGames);
}
