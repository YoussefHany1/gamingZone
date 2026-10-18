import React, { memo, useCallback, useRef } from "react";
import { StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import AdSlot from "@/src/components/AdSlot";
import DeferredSection from "./DeferredSection";
import FreeGames from "./sections/FreeGames";
import RecommendedGames from "./sections/RecommendedGames";
import Popular from "./sections/Popular";
import SteamTopSellers from "./sections/SteamTopSellers";
import TrendingPlatformSection from "./sections/TrendingPlatformSection";
import RecentlyReleased from "./sections/RecentlyReleased";
import ComingSoon from "./sections/ComingSoon";
import MostAnticipated from "./sections/MostAnticipated";
import NostalgiaCorner from "./sections/NostalgiaCorner";
import TopRated from "./sections/TopRated";
import type { FeedItemConfig } from "../../types";
import type { GamesFeedProps } from "./types";

// Feed items that are pure static components (no props/state); defined outside
// the component so the array reference never changes between renders.
const STATIC_FEED_ITEMS: FeedItemConfig[] = [
  { id: "free_games", type: "COMPONENT" },
  { id: "recommended", type: "COMPONENT" },
  { id: "ad_1", type: "AD" },
  { id: "popular", type: "COMPONENT" },
  { id: "trending_platform", type: "COMPONENT" },
  { id: "ad_2", type: "AD" },
  { id: "anticipated", type: "COMPONENT" },
  { id: "steam_top_sellers", type: "COMPONENT" },
  { id: "ad_3", type: "AD" },
  { id: "recently_released", type: "COMPONENT" },
  { id: "coming_soon", type: "COMPONENT" },
  { id: "ad_4", type: "AD" },
  { id: "nostalgia", type: "COMPONENT" },
  { id: "top_rated", type: "COMPONENT" },
];

const staticStyles = StyleSheet.create({
  listContent: { paddingBottom: 90 },
});

// Stable memoized section wrappers — defined at module scope so their
// references never change, which lets renderFeedItem remain stable.
const FreeGamesSection = memo(() => <FreeGames />);
const RecommendedSection = memo(() => <RecommendedGames />);
const PopularSection = memo(() => <Popular />);
const SteamSection = memo(() => <SteamTopSellers />);
const TrendingSection = memo(() => <TrendingPlatformSection />);
const ReleasedSection = memo(() => <RecentlyReleased />);
const ComingSoonSection = memo(() => <ComingSoon />);
const AnticipatedSection = memo(() => <MostAnticipated />);
const NostalgiaSection = memo(() => <NostalgiaCorner />);
const TopRatedSection = memo(() => <TopRated />);
FreeGamesSection.displayName = "FreeGamesSection";
RecommendedSection.displayName = "RecommendedSection";
PopularSection.displayName = "PopularSection";
SteamSection.displayName = "SteamSection";
TrendingSection.displayName = "TrendingSection";
ReleasedSection.displayName = "ReleasedSection";
ComingSoonSection.displayName = "ComingSoonSection";
AnticipatedSection.displayName = "AnticipatedSection";
NostalgiaSection.displayName = "NostalgiaSection";
TopRatedSection.displayName = "TopRatedSection";

/**
 * Browsable games feed: a static list of game sections, ad slots and a themed
 * header. Sections below the fold are wrapped in DeferredSection with staggered
 * delays so their fetches and image loads don't all fire at once on cold start.
 */
const GamesFeed: React.FC<GamesFeedProps> = ({ onScroll }) => {
  const { t } = useTranslation();

  // Keep a ref so renderFeedItem can read t() without it being a dep.
  const tRef = useRef(t);
  tRef.current = t;

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItemConfig }) => {
      if (item.type === "AD") return <AdSlot marginVertical={20} />;
      switch (item.id) {
        case "free_games":
          return <FreeGamesSection />;
        case "recommended":
          return (
            <DeferredSection delay={600}>
              <RecommendedSection />
            </DeferredSection>
          );
        case "popular":
          return (
            <DeferredSection delay={900}>
              <PopularSection />
            </DeferredSection>
          );
        case "steam_top_sellers":
          return (
            <DeferredSection delay={1800}>
              <SteamSection />
            </DeferredSection>
          );
        case "trending_platform":
          return (
            <DeferredSection delay={1200}>
              <TrendingSection />
            </DeferredSection>
          );
        case "recently_released":
          return (
            <DeferredSection delay={2100}>
              <ReleasedSection />
            </DeferredSection>
          );
        case "coming_soon":
          return (
            <DeferredSection delay={2400}>
              <ComingSoonSection />
            </DeferredSection>
          );
        case "anticipated":
          return (
            <DeferredSection delay={1500}>
              <AnticipatedSection />
            </DeferredSection>
          );
        case "nostalgia":
          return (
            <DeferredSection delay={2700}>
              <NostalgiaSection />
            </DeferredSection>
          );
        case "top_rated":
          return (
            <DeferredSection delay={3000}>
              <TopRatedSection />
            </DeferredSection>
          );
        default:
          return null;
      }
    },
    [],
  );

  return (
    <FlashList
      data={STATIC_FEED_ITEMS}
      renderItem={renderFeedItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={16}
      getItemType={(item) => (item.type === "AD" ? "AD" : item.id)}
      contentContainerStyle={staticStyles.listContent}
    />
  );
};

export default memo(GamesFeed);
