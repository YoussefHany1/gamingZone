import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import SkeletonRecentlyReleased from "../../../skeleton/gamesScreen/SkeletonRecentlyReleased";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useRecentlyReleased } from "../../../hooks/useRecentlyReleased";
import { GameSection } from "./GameSection";
import RecentGameCard from "./RecentGameCard";
import type { Game } from "@/src/types/sharedTypes";

const CARD_HEIGHT = 200;

/**
 * The games feed's `recently_released` section, rendered through the
 * shared shell.
 *
 * Divergences its shell config encodes, all verbatim from the legacy:
 * it is the one VERTICAL rail (no horizontal, no snap interval, native
 * ScrollView on both lists); its skeleton list carries a keyExtractor;
 * and its legacy list branch never excluded the loading frame — the empty
 * data list renders under the skeleton — so `showListWhilePending` is
 * set, exactly as the ported section did.
 */
function RecentlyReleased(): React.ReactElement {
  const { t } = useTranslation();
  const { games, isLoading, error } = useRecentlyReleased();

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
    listContent: { paddingBottom: 20 },
  }));

  const renderCard = useCallback(
    (item: Game) => <RecentGameCard item={item} />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonRecentlyReleased />, []);

  return (
    <GameSection
      title={t("games.list.recentlyReleased.title")}
      subtitle={t("games.list.recentlyReleased.subtitle")}
      games={games}
      isLoading={isLoading}
      error={error}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      skeletonWithKeyExtractor
      showListWhilePending
      styles={styles}
    />
  );
}

export default RecentlyReleased;
