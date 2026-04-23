import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  StyleSheet, View, TextInput, TouchableOpacity, InteractionManager,
  FlatList, Text, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { Ionicons } from "@expo/vector-icons";
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
import FilterModal, { GameFilters } from "../components/gamesScreen/FilterModal";
import { adUnitId } from "../constants/config";
import COLORS from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";

// Types
type FeedItemType = "COMPONENT" | "AD";

interface FeedItemConfig {
  id: string;
  type: FeedItemType;
}

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

// Ad Container
const AdContainer = memo(() => {
  const { t } = useTranslation();
  return (
    <View style={styles.adContainer}>
      <Text style={styles.adLabel}>{t("common.ad")}</Text>
      <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
    </View>
  );
});
AdContainer.displayName = "AdContainer";

// Helper – count active filters
function countActiveFilters(f: GameFilters): number {
  return (f.year ? 1 : 0) + (f.genre ? 1 : 0) + (f.platform ? 1 : 0) + (f.sort && f.sort !== "relevance" ? 1 : 0);
}

// main

function GamesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [submittedQuery, setSubmittedQuery] = useState<string>("");
  const [showAds, setShowAds] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [filters, setFilters] = useState<GameFilters>({
    year: null,
    genre: null,
    platform: null,
    sort: "relevance",
  });

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  const handleSearchTextChange = useCallback((text: string): void => {
    setSearchQuery(text);
    if (text === "") setSubmittedQuery("");
  }, []);

  const handleClearSearch = useCallback((): void => {
    setSearchQuery("");
    setSubmittedQuery("");
    Keyboard.dismiss();
  }, []);

  const handleSubmitSearch = useCallback((): void => {
    setSubmittedQuery(searchQuery);
    Keyboard.dismiss();
  }, [searchQuery]);

  const handleApplyFilters = useCallback((newFilters: GameFilters): void => {
    setFilters(newFilters);
  }, []);

  const handleBack = useCallback((): void => {
    setSearchQuery("");
    setSubmittedQuery("");
    setFilters({ year: null, genre: null, platform: null, sort: "relevance" });
    Keyboard.dismiss();
  }, []);

  const openFilter = useCallback((): void => {
    setFilterVisible(true);
  }, []);

  // The text query sent to search (empty string = browse by filters only)
  const effectiveQuery = useMemo((): string => {
    return submittedQuery.trim();
  }, [submittedQuery]);

  const activeFilterCount = countActiveFilters(filters);
  const showResults = effectiveQuery !== "" || activeFilterCount > 0;

  // Build the renderable feed by mapping static config to JSX
  const FEED_DATA = useMemo(
    () =>
      STATIC_FEED_ITEMS.map((item) => {
        if (item.type === "AD") return item;
        const componentMap: Record<string, React.ReactElement> = {
          header: <LinearGradient colors={["#516996", "#3b4d6e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}><Text style={styles.headerText}>{t("games.header")}</Text></LinearGradient>,
          free_games: <FreeGames />,
          news: <GamesNews />,
          popular: <Popular />,
          steam_top_sellers: <SteamTopSellers />,
          trending_mobile: <TrendingMobileGames />,
          recently_released: <RecentlyReleased />,
          coming_soon: <ComingSoon />,
          anticipated: <MostAnticipated />,
          nostalgia: <NostalgiaCorner />,
          top_rated: <TopRated />,
        };
        return { ...item, component: componentMap[item.id] };
      }),
    [t]
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: { id: string; type: FeedItemType; component?: React.ReactElement } }) => {
      if (item.type === "AD") return showAds ? <AdContainer /> : null;
      return <View>{item.component}</View>;
    },
    [showAds]
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
            <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

      {showResults ? (
        <View style={{ flex: 1 }}>
          <GamesList query={effectiveQuery || undefined} filters={filters} onBack={handleBack} />
        </View>
      ) : (
        <FlatList
          data={FEED_DATA}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          windowSize={15}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
        />
      )}

      <FilterModal
        visible={filterVisible}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFilterVisible(false)}
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
