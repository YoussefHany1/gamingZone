import { useSectionFeed } from "./useSectionFeed";
import { fetchSteamTopSellerGames } from "@/src/services/api/igdbApi";

/**
 * The cache key for the steam top-sellers feed section.
 *
 * Load-bearing: byte-identical to the value the legacy section used, so a
 * warm cache survives the migration (docs/refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "GAMES_CACHE_STEAM_TOP_SELLERS";

/** Steam top sellers for the games feed's `steam_top_sellers` section. */
export function useSteamTopSellers() {
  return useSectionFeed(STORAGE_KEY, fetchSteamTopSellerGames);
}
