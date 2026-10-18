import { useSectionFeed } from "./useSectionFeed";
import { fetchTrendingMobileGames } from "@/src/services/api/igdbApi";

/**
 * The cache key for the mobile-trending rail — the fallback variant of the
 * `trending_platform` section, shown when the user has no platform set.
 *
 * Load-bearing: byte-identical to the value the legacy section used (docs/
 * refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "GAMES_CACHE_TRENDING_MOBILE";

/** Trending mobile games for the games feed's `trending_platform` section. */
export function useTrendingMobile() {
  return useSectionFeed(STORAGE_KEY, fetchTrendingMobileGames);
}
