import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import SkeletonPopular from "../../../skeleton/gamesScreen/SkeletonPopular";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { usePopular } from "../../../hooks/usePopular";
import { GameSection } from "./GameSection";
import PosterGameCard from "./PosterGameCard";
import type { Game } from "@/src/types/sharedTypes";

const CARD_HEIGHT = 300;
const CARD_WIDTH = 165;
const CARD_MARGIN = 5;

/**
 * The games feed's `popular` section, rendered through the shared shell.
 *
 * The rendering contract is the same one `sections/Popular.tsx` ports:
 * family-A defaults (in-list skeleton rail without a scroll component or
 * keyExtractor, plain-error branch with the list hidden while the
 * skeleton is up, serverError empty state) plus the horizontal
 * GestureScrollView list with snap-to-interval.
 */
function Popular(): React.ReactElement {
  const { t } = useTranslation();
  const { games, isLoading, error } = usePopular();

  const styles = useThemeStyles(() => ({
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: "space-between",
      margin: 18,
    },
    errorContainer: {
      width: "100%",
      height: CARD_HEIGHT,
    },
    listContent: { paddingHorizontal: 10, paddingVertical: 5 },
  }));

  const renderCard = useCallback(
    (item: Game, index: number) => (
      <PosterGameCard item={item} index={index} centerStatItems />
    ),
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonPopular />, []);

  return (
    <GameSection
      title={t("games.list.popular.title")}
      subtitle={t("games.list.popular.subtitle")}
      games={games}
      isLoading={isLoading}
      error={error}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      horizontal
      useGestureScroll
      snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
      styles={styles}
    />
  );
}

export default Popular;
