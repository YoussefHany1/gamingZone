import { useSectionFeed } from "./useSectionFeed";
import { fetchNostalgiaGames } from "@/src/services/api/igdbApi";

/**
 * The cache key for the nostalgia-corner feed section.
 *
 * Load-bearing: byte-identical to the value the legacy section used, so a
 * warm cache survives the migration (docs/refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "GAMES_CACHE_NOSTALGIA_CORNER";

/** Retro games for the games feed's `nostalgia` section. */
export function useNostalgiaCorner() {
  return useSectionFeed(STORAGE_KEY, fetchNostalgiaGames);
}
