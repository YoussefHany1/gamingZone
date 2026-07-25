import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  InteractionManager,
  Text,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { Ionicons } from "@expo/vector-icons";
import SkeletonFreeGames from "../skeleton/gamesScreen/SkeletonFreeGames";
import SkeletonNewsItem from "@/src/features/news/skeleton/SkeletonNewsItem";
import FreeGames from "../components/gamesScreen/FreeGames";
import GamesList from "../components/gamesScreen/GamesList";
import GamesNews from "../components/gamesScreen/GamesNews";
import ComingSoon from "../components/gamesScreen/ComingSoon";
import MostAnticipated from "../components/gamesScreen/MostAnticipated";
import RecentlyReleased from "../components/gamesScreen/RecentlyReleased";
import TopRated from "../components/gamesScreen/TopRated";
import NostalgiaCorner from "../components/gamesScreen/NostalgiaCorner";
import SteamTopSellers from "../components/gamesScreen/SteamTopSellers";
import Popular from "../components/gamesScreen/Popular";
import TrendingMobileGames from "../components/gamesScreen/TrendingMobile";
import FilterModal from "../components/gamesScreen/FilterModal";
import type { FeedItemConfig } from "../types";
import { adUnitId } from "@/src/constants/config";
import COLORS from "@/src/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useGames } from "../hooks/useGames";

// Feed items that are pure static components (no props/state); defined outside
// the component so the array reference never changes between renders.
const STATIC_FEED_ITEMS: FeedItemConfig[] = [
  { id: "header", type: "COMPONENT" },
  { id: "free_games", type: "COMPONENT" },
  { id: "news", type: "COMPONENT" },
  { id: "ad_1", type: "AD" },
  { id: "popular", type: "COMPONENT" },
  { id: "trending_mobile", type: "COMPONENT" },
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

// Ad Container — owns its own showAds state so it never triggers a list re-render
const AdContainer = memo(() => {
  const { t } = useTranslation();
  const [showAds, setShowAds] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);
  if (!showAds) return null;
  return (
    <View style={styles.adContainer}>
      <Text style={styles.adLabel}>{t("common.ad")}</Text>
      <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
    </View>
  );
});
AdContainer.displayName = "AdContainer";

// Stable memoized section wrappers — defined at module scope so their
// references never change, which lets renderItem remain dep-free.
const FreeGamesSection = memo(() => <FreeGames />);
const GamesNewsSection = memo(() => <GamesNews />);
const PopularSection = memo(() => <Popular />);
const SteamSection = memo(() => <SteamTopSellers />);
const TrendingSection = memo(() => <TrendingMobileGames />);
const ReleasedSection = memo(() => <RecentlyReleased />);
const ComingSoonSection = memo(() => <ComingSoon />);
const AnticipatedSection = memo(() => <MostAnticipated />);
const NostalgiaSection = memo(() => <NostalgiaCorner />);
const TopRatedSection = memo(() => <TopRated />);
FreeGamesSection.displayName = "FreeGamesSection";
GamesNewsSection.displayName = "GamesNewsSection";
PopularSection.displayName = "PopularSection";
SteamSection.displayName = "SteamSection";
TrendingSection.displayName = "TrendingSection";
ReleasedSection.displayName = "ReleasedSection";
ComingSoonSection.displayName = "ComingSoonSection";
AnticipatedSection.displayName = "AnticipatedSection";
NostalgiaSection.displayName = "NostalgiaSection";
TopRatedSection.displayName = "TopRatedSection";

// main

function GamesScreen(): React.ReactElement {
  const {
    t,
    searchQuery,
    filterVisible,
    filters,
    isReady,
    effectiveQuery,
    activeFilterCount,
    showResults,
    onScroll,
    handleSearchTextChange,
    handleClearSearch,
    handleSubmitSearch,
    handleApplyFilters,
    handleBack,
    openFilter,
    closeFilter,
  } = useGames();

  // Keep a ref so renderFeedItem can read t() without it being a dep
  const tRef = useRef(t);
  tRef.current = t;

  // renderFeedItem is fully stable (empty deps). It reads t() via tRef at
  // call-time. Each memoized section wrapper is defined at module scope so
  // its reference never changes.
  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItemConfig }) => {
      if (item.type === "AD") return <AdContainer />;
      switch (item.id) {
        case "header":
          return (
            <LinearGradient
              colors={["#516996", "#3b4d6e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <Text style={styles.headerText}>{tRef.current("games.header")}</Text>
            </LinearGradient>
          );
        case "free_games":
          return <FreeGamesSection />;
        case "news":
          return <GamesNewsSection />;
        case "popular":
          return <PopularSection />;
        case "steam_top_sellers":
          return <SteamSection />;
        case "trending_mobile":
          return <TrendingSection />;
        case "recently_released":
          return <ReleasedSection />;
        case "coming_soon":
          return <ComingSoonSection />;
        case "anticipated":
          return <AnticipatedSection />;
        case "nostalgia":
          return <NostalgiaSection />;
        case "top_rated":
          return <TopRatedSection />;
        default:
          return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Search bar + filter button row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("games.searchPlaceholder")}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={24} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={openFilter}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? "#fff" : COLORS.lightGray}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!isReady ? (
        <View style={{ flex: 1, padding: 16 }}>
          <SkeletonFreeGames />
          <View style={{ height: 20 }} />
          <SkeletonNewsItem />
        </View>
      ) : showResults ? (
        <View style={{ flex: 1 }}>
          <GamesList
            query={effectiveQuery || undefined}
            filters={filters}
            onBack={handleBack}
          />
        </View>
      ) : (
        <FlashList
          data={STATIC_FEED_ITEMS}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 90 }}
          estimatedItemSize={300}
        />
      )}

      <FilterModal
        visible={filterVisible}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={closeFilter}
      />
    </SafeAreaView>
  );
}

export default GamesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
    gap: 10,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e2a45",
    paddingHorizontal: 15,
    paddingBottom: 2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    backgroundColor: "#1e2a45",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.lightGray,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  header: {
    padding: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#516996",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginHorizontal: 50,
  },
  headerText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  adContainer: {
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  adLabel: {
    color: "#fff",
    marginBottom: 10,
  },
});
