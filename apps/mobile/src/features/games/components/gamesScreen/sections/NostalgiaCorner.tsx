import React, { useCallback } from "react";
import { Dimensions } from "react-native";
import { useTranslation } from "react-i18next";
import SkeletonNostalgiaCorner from "../../../skeleton/gamesScreen/SkeletonNostalgiaCorner";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useNostalgiaCorner } from "../../../hooks/useNostalgiaCorner";
import { GameSection } from "./GameSection";
import NostalgiaCard from "./NostalgiaCard";
import type { Game } from "@/src/types/sharedTypes";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;
const CARD_HEIGHT = 360;
const CARD_MARGIN = 10;

/**
 * The games feed's `nostalgia` section, rendered through the shared shell.
 *
 * Divergences preserved exactly: the skeleton rail is FOUR placeholder
 * rows (not the five every sibling uses), and it is the one family-A
 * skeleton that ran with BOTH a scroll component and a keyExtractor. The
 * header row has no justifyContent. Viewport-derived 55%-width cards
 * (Dimensions read at module scope) stay here for the snap interval, as
 * in the legacy.
 */
function NostalgiaCorner(): React.ReactElement {
  const { t } = useTranslation();
  const { games, isLoading, error } = useNostalgiaCorner();

  const styles = useThemeStyles(() => ({
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      margin: 18,
    },
    errorContainer: {
      width: "100%",
      height: CARD_HEIGHT,
    },
    listContent: { paddingHorizontal: 10, paddingVertical: 5 },
  }));

  const renderCard = useCallback(
    (item: Game) => <NostalgiaCard item={item} />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonNostalgiaCorner />, []);

  return (
    <GameSection
      title={t("games.list.nostalgiaCorner.title")}
      subtitle={t("games.list.nostalgiaCorner.subtitle")}
      games={games}
      isLoading={isLoading}
      error={error}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      skeletonRows={4}
      skeletonWithScrollComponent
      skeletonWithKeyExtractor
      horizontal
      useGestureScroll
      snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
      styles={styles}
    />
  );
}

export default NostalgiaCorner;
