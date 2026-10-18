import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import SkeletonTopRated from "../../../skeleton/gamesScreen/SkeletonTopRated";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useTopRated } from "../../../hooks/useTopRated";
import { GameSection } from "./GameSection";
import TopRatedCard from "./TopRatedCard";
import type { Game } from "@/src/types/sharedTypes";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_MARGIN = 5;

/**
 * The games feed's `top_rated` section, rendered through the shared shell.
 *
 * Asymmetries preserved exactly as catalogued in the legacy: the skeleton
 * rail HAS a keyExtractor but runs on the native ScrollView (no scroll
 * component) while the data list uses GestureScrollView; and the legacy
 * list branch never excluded the loading frame, so the empty data list
 * renders under the skeleton (`showListWhilePending`). The legacy's
 * no-op `container: {}` style is dropped — an empty ViewStyle is
 * equivalent to no style prop.
 */
function TopRated(): React.ReactElement {
  const { t } = useTranslation();
  const { games, isLoading, error } = useTopRated();

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
    (item: Game, index: number) => <TopRatedCard item={item} index={index} />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonTopRated />, []);

  return (
    <GameSection
      title={t("games.list.topRated.title")}
      subtitle={t("games.list.topRated.subtitle")}
      games={games}
      isLoading={isLoading}
      error={error}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      skeletonWithKeyExtractor
      showListWhilePending
      horizontal
      useGestureScroll
      snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
      styles={styles}
    />
  );
}

export default TopRated;
