import { useCallback } from "react";
import useCachedData from "@/src/hooks/useCachedData";
import { fetchGameById } from "@/src/services/api/igdbApi";
import { withTrace } from "@/src/services/performanceService";
import { gameDetailsCacheKey } from "../lib/gameDetailsCacheKey";
import type { GameData } from "../types";

export type GameDataResult = {
  game: GameData | null;
  loading: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
};

/**
 * The details payload for one game, served from MMKV and revalidated in the
 * background once its TTL expires.
 *
 * The fetch is wrapped in `withTrace` so a slow IGDB round-trip shows up in the
 * performance log as `game_details_load`.
 */
export function useGameData(currentId: number | string): GameDataResult {
  const cacheKey = currentId ? gameDetailsCacheKey(currentId) : "";

  const fetchGameData = useCallback(async (): Promise<GameData> => {
    if (!currentId) throw new Error("No game ID provided");
    return withTrace("game_details_load", () => fetchGameById(currentId));
  }, [currentId]);

  const { data, isLoading, error, refetch } = useCachedData<GameData>(
    cacheKey,
    fetchGameData,
    [currentId],
  );

  return { game: data, loading: isLoading, error, refetch };
}
