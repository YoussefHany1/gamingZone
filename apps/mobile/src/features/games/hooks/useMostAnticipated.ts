import { useMemo } from "react";
import { useSectionFeed } from "./useSectionFeed";
import { fetchMostAnticipatedGames } from "@/src/services/api/igdbApi";
import type { Game } from "@/src/types/sharedTypes";

/**
 * The cache key for the most-anticipated feed section.
 *
 * Load-bearing: byte-identical to the value the legacy section used. Note it
 * deviates from the sections' usual `GAMES_CACHE_*` prefix on purpose — a
 * "cleanup" here would fork every user's cache (docs/refactor-smoke-checklist.md §1).
 */
const STORAGE_KEY = "MOST_ANTICIPATED_CACHE";

// Sort ascending by release date; games without a date go to the end
const sortByReleaseDate = (games: Game[]): Game[] => {
  if (!Array.isArray(games) || games.length === 0) return [];
  return [...games].sort((a, b) => {
    const dateA = a.first_release_date ?? Infinity;
    const dateB = b.first_release_date ?? Infinity;
    return dateA - dateB;
  });
};

/**
 * Most anticipated games for the games feed's `anticipated` section.
 *
 * The legacy section sorted the payload with a `useMemo` before rendering;
 * that sort is data policy, so it lives here — same input (`games`),
 * same memo dependency, same semantics. As a side effect this hook's
 * `games` is always an array (never null): `sortByReleaseDate` absorbs the
 * stale-or-missing payload cases the shared `useSectionFeed` result can
 * surface.
 */
export function useMostAnticipated() {
  const { games, isLoading, error } = useSectionFeed(
    STORAGE_KEY,
    fetchMostAnticipatedGames,
  );

  const sortedGames = useMemo(() => sortByReleaseDate(games ?? []), [games]);

  return { games: sortedGames, isLoading, error };
}
