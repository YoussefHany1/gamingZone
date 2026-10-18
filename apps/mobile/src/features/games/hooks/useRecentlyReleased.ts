import { useSectionFeed } from "./useSectionFeed";
import { fetchRecentlyReleasedGames } from "@/src/services/api/igdbApi";

/**
 * The cache key for the recently-released feed section.
 *
 * Load-bearing: byte-identical to the value the legacy section used, so a
 * warm cache survives the migration (docs/refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "GAMES_CACHE_RECENTLY_RELEASED";

/** Recently released games for the games feed's `recently_released` section. */
export function useRecentlyReleased() {
  return useSectionFeed(STORAGE_KEY, fetchRecentlyReleasedGames);
}
