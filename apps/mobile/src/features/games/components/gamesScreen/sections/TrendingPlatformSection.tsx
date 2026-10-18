import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import SkeletonPopular from "../../../skeleton/gamesScreen/SkeletonPopular";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useUserPlatform, type UserPlatform } from "@/src/hooks/useUserPlatform";
import { useTrendingMobile } from "../../../hooks/useTrendingMobile";
import { useTrendingByPlatform } from "../../../hooks/useTrendingByPlatform";
import { GameSection } from "./GameSection";
import PosterGameCard from "./PosterGameCard";
import type { Game } from "@/src/types/sharedTypes";

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 5;

/** Human platform names used to interpolate the per-platform rail title. */
const PLATFORM_LABELS: Record<UserPlatform, string> = {
  pc: "PC",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo Switch",
  android: "Android",
  ios: "iOS",
};

/**
 * The `trending_platform` section is a DISPATCHER rendered through the
 * shared shell: it resolves the user's platform once and mounts one of two
 * interchangeable internal rails. Both rails share the family-A config --
 * bare in-list skeleton (no scroll component, no keyExtractor), plain-error
 * branch with the list hidden while pending, and the SteamTopSellers-style
 * "noResults" empty message -- and their per-variant i18n `defaultValue`
 * fallbacks stay in the section, exactly as the legacy wrote them.
 *
 * Signals are unchanged: `loading` returns null (the section hides
 * entirely — shell is not mounted at all), platform set →
 * `TrendingByPlatformInternal`, otherwise → `TrendingMobileInternal`.
 * The internal rails stay file-local (the legacy also named-exported them,
 * but nothing imported them); the shared rank-badged card is the Phase 4
 * `PosterGameCard` (Trending passes `deriveRecyclingKey`, the only poster
 * consumer that historically derived a CoverImage recyclingKey).
 */
function TrendingMobileInternal(): React.ReactElement {
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

  const { t } = useTranslation();
  const { games, isLoading, error } = useTrendingMobile();

  const renderCard = useCallback(
    (item: Game, index: number) => <PosterGameCard item={item} index={index} deriveRecyclingKey />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonPopular />, []);

  return (
    <GameSection
      title={t("games.list.trendingMobile.title", "Trending Mobile")}
      subtitle={t("games.list.trendingMobile.subtitle", "Best games on the go")}
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
TrendingMobileInternal.displayName = "TrendingMobileInternal";

function TrendingByPlatformInternal({
  platform,
}: {
  platform: UserPlatform;
}): React.ReactElement {
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

  const { t } = useTranslation();
  const platformLabel = PLATFORM_LABELS[platform];
  const { games, isLoading, error } = useTrendingByPlatform(platform);

  const renderCard = useCallback(
    (item: Game, index: number) => <PosterGameCard item={item} index={index} deriveRecyclingKey />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonPopular />, []);

  return (
    <GameSection
      title={t("games.list.trendingPlatform.title", {
        platform: platformLabel,
      })}
      subtitle={t("games.list.trendingPlatform.subtitle")}
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
TrendingByPlatformInternal.displayName = "TrendingByPlatformInternal";

/**
 * The games feed's `trending_platform` section — see the doc comment at the
 * internal rails for the dispatcher contract. The per-platform data policy
 * lives in `hooks/useTrendingByPlatform.ts` (including the platform cache
 * key template, byte-identical per UserPlatform) and the mobile fallback in
 * `hooks/useTrendingMobile.ts`.
 */
function TrendingPlatformSection(): React.ReactElement | null {
  const { platform, loading } = useUserPlatform();

  if (loading) {
    return null;
  }

  if (platform) {
    return <TrendingByPlatformInternal platform={platform} />;
  }

  return <TrendingMobileInternal />;
}

TrendingPlatformSection.displayName = "TrendingPlatformSection";

export default TrendingPlatformSection;
