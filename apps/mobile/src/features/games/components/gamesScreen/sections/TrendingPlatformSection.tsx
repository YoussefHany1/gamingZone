import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import SkeletonPopular from "../../../skeleton/gamesScreen/SkeletonPopular";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useUserPlatform, type UserPlatform } from "@/src/hooks/useUserPlatform";
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
 * The `trending_platform` section renders the user's platform rail once a
 * platform has been selected on their profile. It shares the family-A config --
 * bare in-list skeleton (no scroll component, no keyExtractor), plain-error
 * branch with the list hidden while pending, and the SteamTopSellers-style
 * "noResults" empty message -- and its per-variant i18n `defaultValue`
 * fallbacks stay in the section, exactly as the legacy wrote them.
 *
 * Signals are unchanged: `loading` returns null (the section hides
 * entirely — shell is not mounted at all), and a missing platform also
 * returns null: the section only exists for users who picked a platform.
 * The shared rank-badged card is the Phase 4
 * `PosterGameCard` (Trending passes `deriveRecyclingKey`, the only poster
 * consumer that historically derived a CoverImage recyclingKey).
 */
function TrendingPlatformInternal({
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
TrendingPlatformInternal.displayName = "TrendingPlatformInternal";

/**
 * The games feed's `trending_platform` section — hidden while the user's
 * platform is loading and when they haven't selected one. The per-platform
 * data policy lives in `hooks/useTrendingByPlatform.ts` (including the
 * platform cache key template, byte-identical per UserPlatform).
 */
function TrendingPlatformSection(): React.ReactElement | null {
  const { platform, loading } = useUserPlatform();

  if (loading || !platform) {
    return null;
  }

  return <TrendingPlatformInternal platform={platform} />;
}

TrendingPlatformSection.displayName = "TrendingPlatformSection";

export default TrendingPlatformSection;
