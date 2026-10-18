import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import SkeletonPopular from "../../../skeleton/gamesScreen/SkeletonPopular";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useSteamTopSellers } from "../../../hooks/useSteamTopSellers";
import { GameSection } from "./GameSection";
import SteamTopSellersCard from "./SteamTopSellersCard";
import type { Game } from "@/src/types/sharedTypes";

const CARD_WIDTH = 180;
const CARD_HEIGHT = 280;
const CARD_MARGIN = 6;

/**
 * The games feed's `steam_top_sellers` section, rendered through the
 * shared shell.
 *
 * Divergences preserved exactly: the empty-list message is
 * `games.list.noResults` — the one serverError outlier in this position
 * — and the flat skeleton list ran with neither a scroll component nor a
 * keyExtractor (both shell defaults). Its header margins are its own and
 * stay in the style factory.
 */
function SteamTopSellers(): React.ReactElement {
  const styles = useThemeStyles(() => ({
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 18,
      marginTop: 18,
      marginBottom: 10,
    },
    errorContainer: {
      width: "100%",
      height: CARD_HEIGHT,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
  }));

  const { t } = useTranslation();
  const { games, isLoading, error } = useSteamTopSellers();

  const renderCard = useCallback(
    (item: Game, index: number) => <SteamTopSellersCard item={item} index={index} />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonPopular />, []);

  return (
    <GameSection
      title={t("games.list.steamTopSellers.title", "Steam Top Sellers")}
      subtitle={t("games.list.steamTopSellers.subtitle", "Global top selling games on Steam")}
      games={games}
      isLoading={isLoading}
      error={error}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      horizontal
      useGestureScroll
      snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
      emptyState="noResults"
      styles={styles}
    />
  );
}

export default SteamTopSellers;
