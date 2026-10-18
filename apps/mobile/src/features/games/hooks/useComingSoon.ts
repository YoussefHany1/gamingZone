import { useSectionFeed } from "./useSectionFeed";
import { fetchComingSoonGames } from "@/src/services/api/igdbApi";

/**
 * The cache key for the coming-soon feed section.
 *
 * Load-bearing: byte-identical to the value the legacy section used, so a
 * warm cache survives the migration (docs/refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "GAMES_CACHE_COMING_SOON";

/** Upcoming releases for the games feed's `coming_soon` section. */
export function useComingSoon() {
  return useSectionFeed(STORAGE_KEY, fetchComingSoonGames);
}
