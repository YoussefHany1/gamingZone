import { useCallback, useMemo } from "react";
import { AD_INTERVAL } from "../constants";
import type { GameEntry, UserGamesRow } from "../types";

type UseUserGamesRowsOptions = {
  games: GameEntry[];
  /** Deferred flag: ads only start loading after the first paint. */
  showAds: boolean;
  /** Global ads switch (privacy/settings). */
  adsEnabled: boolean;
};

/**
 * Interleaves inline ad slots between games (every {@link AD_INTERVAL}) for both
 * view modes. The renderer decides how each slot looks (grid box vs. list row).
 * Ads only appear when both `showAds` and `adsEnabled` are true.
 */
export function useUserGamesRows({
  games,
  showAds,
  adsEnabled,
}: UseUserGamesRowsOptions): {
  rows: UserGamesRow[];
  getItemType: (item: UserGamesRow) => UserGamesRow["type"];
} {
  const rows = useMemo<UserGamesRow[]>(() => {
    const result: UserGamesRow[] = [];
    games.forEach((game, index) => {
      result.push({ type: "game", id: `game-${game.id}`, game });
      const showAd =
        showAds &&
        adsEnabled &&
        ((index + 1) % AD_INTERVAL === 0 ||
          (games.length < AD_INTERVAL && index === games.length - 1));
      if (showAd) result.push({ type: "ad", id: `ad-${index}` });
    });
    return result;
  }, [games, showAds, adsEnabled]);

  const getItemType = useCallback((item: UserGamesRow) => item.type, []);

  return { rows, getItemType };
}
