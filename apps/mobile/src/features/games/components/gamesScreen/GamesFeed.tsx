import React, { memo, useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import AdSlot from "@/src/components/AdSlot";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import { useUserPlatform } from "@/src/hooks/useUserPlatform";
import DeferredSection from "./DeferredSection";
import FreeGames from "./sections/FreeGames";
import { RecommendedGamesView } from "./sections/RecommendedGames";
import TrendingPlatformSection from "./sections/TrendingPlatformSection";
import Popular from "./sections/Popular";
import SteamTopSellers from "./sections/SteamTopSellers";
import RecentlyReleased from "./sections/RecentlyReleased";
import ComingSoon from "./sections/ComingSoon";
import MostAnticipated from "./sections/MostAnticipated";
import NostalgiaCorner from "./sections/NostalgiaCorner";
import TopRated from "./sections/TopRated";
import { GamingEvents } from "@/src/features/events";
import { useRecommendedGames } from "../../hooks/useRecommendedGames";
import type { RecommendedGamesState } from "../../hooks/useRecommendedGames";
import type { FeedItemConfig } from "../../types";
import type { GamesFeedProps } from "./types";

const FEED_HEAD: FeedItemConfig[] = [{ id: "free_games", type: "COMPONENT" }];

// The three personalized discovery slots now live as independent sections in
// the games feed. Their conditions are evaluated before building the feed data,
// so a skipped section never leaves an empty FlashList cell behind.
const FEED_TAIL: FeedItemConfig[] = [
  { id: "ad_1", type: "AD" },
  { id: "anticipated", type: "COMPONENT" },
  { id: "ad_2", type: "AD" },
  { id: "steam_top_sellers", type: "COMPONENT" },
  { id: "ad_3", type: "AD" },
  { id: "recently_released", type: "COMPONENT" },
  { id: "coming_soon", type: "COMPONENT" },
  { id: "events", type: "COMPONENT" },
  { id: "ad_4", type: "AD" },
  { id: "nostalgia", type: "COMPONENT" },
  { id: "top_rated", type: "COMPONENT" },
];

const staticStyles = StyleSheet.create({
  listContent: { flexGrow: 1 },
});

// Stable memoized section wrappers — defined at module scope so their
// references never change between renders, which lets renderFeedItem remain stable.
const FreeGamesSection = memo(() => <FreeGames />);
const RecommendedSection = memo(
  ({ state }: { state: RecommendedGamesState }) => <RecommendedGamesView state={state} />,
);
const TrendingSection = memo(() => <TrendingPlatformSection />);
const PopularSection = memo(() => <Popular />);
const SteamSection = memo(() => <SteamTopSellers />);
const ReleasedSection = memo(() => <RecentlyReleased />);
const ComingSoonSection = memo(() => <ComingSoon />);
const AnticipatedSection = memo(() => <MostAnticipated />);
const NostalgiaSection = memo(() => <NostalgiaCorner />);
const TopRatedSection = memo(() => <TopRated />);
const EventsSection = memo(() => <GamingEvents />);
FreeGamesSection.displayName = "FreeGamesSection";
RecommendedSection.displayName = "RecommendedSection";
TrendingSection.displayName = "TrendingSection";
PopularSection.displayName = "PopularSection";
SteamSection.displayName = "SteamSection";
ReleasedSection.displayName = "ReleasedSection";
ComingSoonSection.displayName = "ComingSoonSection";
AnticipatedSection.displayName = "AnticipatedSection";
NostalgiaSection.displayName = "NostalgiaSection";
TopRatedSection.displayName = "TopRatedSection";
EventsSection.displayName = "EventsSection";

/**
 * Browsable games feed: a static list of game sections, ad slots and a themed
 * header. Sections below the fold are wrapped in DeferredSection with staggered
 * delays so their fetches and image loads don't all fire at once on cold start.
 *
 * Unlike Home (which keeps the single fallback DiscoveryRail), this feed renders
 * Recommended / Trending / Popular as independent, individually gated sections.
 */
const GamesFeed: React.FC<GamesFeedProps> = ({ onScroll }) => {
  const bottomInset = useBottomInset();
  // The recommender already watches all three library lists (playing, played,
  // wantToPlay), so its signal is the single source of truth for this gate.
  const recommendedState = useRecommendedGames();
  const { platform, loading: platformLoading } = useUserPlatform();

  const feedItems = useMemo<FeedItemConfig[]>(() => {
    const discovery: FeedItemConfig[] = [];

    if (recommendedState.libraryReady && recommendedState.hasLibraryGames) {
      discovery.push({ id: "recommended", type: "COMPONENT" });
    }
    if (!platformLoading && platform) {
      discovery.push({ id: "trending_platform", type: "COMPONENT" });
    }
    // Popular is the unconditional baseline, even for new/anonymous users.
    discovery.push({ id: "popular", type: "COMPONENT" });

    return [...FEED_HEAD, ...discovery, ...FEED_TAIL];
  }, [recommendedState.hasLibraryGames, recommendedState.libraryReady, platform, platformLoading]);

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItemConfig }) => {
      if (item.type === "AD") return <AdSlot marginVertical={20} />;
      switch (item.id) {
        case "free_games":
          return <FreeGamesSection />;
        case "recommended":
          return (
            <DeferredSection delay={600}>
              <RecommendedSection state={recommendedState} />
            </DeferredSection>
          );
        case "trending_platform":
          return (
            <DeferredSection delay={800}>
              <TrendingSection />
            </DeferredSection>
          );
        case "popular":
          return (
            <DeferredSection delay={1000}>
              <PopularSection />
            </DeferredSection>
          );
        case "steam_top_sellers":
          return (
            <DeferredSection delay={1800}>
              <SteamSection />
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
        case "events":
          return (
            <DeferredSection delay={2550}>
              <EventsSection />
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
    [recommendedState],
  );

  return (
    <FlashList
      data={feedItems}
      renderItem={renderFeedItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={16}
      getItemType={(item) => (item.type === "AD" ? "AD" : item.id)}
      contentContainerStyle={[staticStyles.listContent, { paddingBottom: bottomInset }]}
    />
  );
};

export default memo(GamesFeed);
