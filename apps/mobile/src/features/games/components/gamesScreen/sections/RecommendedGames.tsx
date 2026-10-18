import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import SkeletonPopular from "../../../skeleton/gamesScreen/SkeletonPopular";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useRecommendedGames } from "../../../hooks/useRecommendedGames";
import { GameSection } from "./GameSection";
import PosterGameCard from "./PosterGameCard";
import type { Game } from "@/src/types/sharedTypes";

const CARD_WIDTH = 165;
const CARD_MARGIN = 5;

/**
 * The games feed's `recommended` section, rendered through the shared
 * shell (data policy unchanged in `hooks/useRecommendedGames.ts` — the
 * library watcher / recommendation builder from the earlier recommender
 * split).
 *
 * Branching differs from every sibling on purpose, and it is all shell
 * config here: there is no error state at all (`errorMode="none"` — the
 * hook is cache-backed and never rejects); the list renders only when
 * non-empty (`listRequiresData`); and the section returns `null` —
 * unmounting even the title — when not loading and the recommendation
 * list is empty (`collapseWhenIdleEmpty`). No `ListEmptyComponent` is
 * rendered (`emptyState="none"`). The dynamic genre title/subtitle and
 * the generic-fallback i18n `defaultValue`s are also part of the legacy
 * contract.
 */
function RecommendedGames(): React.ReactElement | null {
  // Every style rule below is theme-independent, so the factory needs no
  // palette (unchanged; the factory still must exist for the lint tooling).
  const styles = useThemeStyles(() => ({
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: "space-between",
      margin: 18,
    },
    listContent: { paddingHorizontal: 10, paddingVertical: 5 },
  }));

  const { t } = useTranslation();
  const { recommendedGames, loading, basedOnGenre } = useRecommendedGames();

  const renderCard = useCallback(
    (item: Game) => <PosterGameCard item={item} statIconVariant="emoji" />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonPopular />, []);

  // Title depends on the extracted genre
  const title = t("games.list.recommended.title", "Recommended for You");
  const subtitle = basedOnGenre
    ? t("games.list.recommended.subtitle", {
        genre: basedOnGenre,
        defaultValue: `Based on your played games`,
      })
    : "";

  return (
    <GameSection
      title={title}
      subtitle={subtitle}
      games={recommendedGames}
      isLoading={loading}
      error={null}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      errorMode="none"
      emptyState="none"
      listRequiresData
      collapseWhenIdleEmpty
      horizontal
      useGestureScroll
      snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
      styles={styles}
    />
  );
}

export default RecommendedGames;
