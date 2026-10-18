import React, { useCallback } from "react";
import { Dimensions } from "react-native";
import { useTranslation } from "react-i18next";
import SkeletonComingSoon from "../../../skeleton/gamesScreen/SkeletonComingSoon";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useComingSoon } from "../../../hooks/useComingSoon";
import { GameSection } from "./GameSection";
import ComingSoonCard from "./ComingSoonCard";
import type { Game } from "@/src/types/sharedTypes";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;

/**
 * The games feed's `coming_soon` section, rendered through the shared
 * shell's whole-section mode.
 *
 * Genuinely divergent from its siblings, on purpose — both facets are
 * shell config now: first load early-returns the WHOLE section including
 * the header (skeleton instead of title row), and the error branch
 * requires an empty list rather than the (vestigial) array defence the
 * family-A rails use, REPLACING the body (`errorMode="errorWhenEmpty"`).
 * When data exists the list renders unconditionally — no third guard —
 * which is exactly what the shell's wholeSection branch does. A stale
 * non-array payload would still reach the list here; that asymmetry is
 * the documented port, not a silently-normalised fix.
 */
function ComingSoon(): React.ReactElement {
  const { t } = useTranslation();
  const { games, isLoading, error } = useComingSoon();

  const styles = useThemeStyles(() => ({
    container: { marginVertical: 10 },
    listContent: { paddingHorizontal: 10 },
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
  }));

  const renderCard = useCallback(
    (item: Game) => <ComingSoonCard item={item} />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonComingSoon />, []);

  return (
    <GameSection
      title={t("games.list.comingSoon.title")}
      subtitle={t("games.list.comingSoon.subtitle")}
      games={games}
      isLoading={isLoading}
      error={error}
      renderCard={renderCard}
      renderSkeletonItem={renderSkeletonItem}
      skeletonMode="wholeSection"
      errorMode="errorWhenEmpty"
      horizontal
      useGestureScroll
      snapToInterval={CARD_WIDTH + 20}
      styles={styles}
    />
  );
}

export default ComingSoon;
