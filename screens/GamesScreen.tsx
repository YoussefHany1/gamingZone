import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  StyleSheet, View, TextInput, TouchableOpacity, InteractionManager,
  FlatList, Text, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { Ionicons } from "@expo/vector-icons";
import FreeGames    from "../components/gamesScreen/FreeGames";
import GamesList    from "../components/gamesScreen/GamesList";
import GamesNews    from "../components/gamesScreen/GamesNews";
import ComingSoon   from "../components/gamesScreen/ComingSoon";
import MostAnticipated  from "../components/gamesScreen/MostAnticipated";
import RecentlyReleased from "../components/gamesScreen/RecentlyReleased";
import TopRated     from "../components/gamesScreen/TopRated";
import NostalgiaCorner  from "../components/gamesScreen/NostalgiaCorner";
import Popular      from "../components/gamesScreen/Popular";
import { adUnitId } from "../constants/config";
import COLORS from "../constants/colors";

// Types
type FeedItemType = "COMPONENT" | "AD";

interface FeedItem {
  id: string;
  type: FeedItemType;
  component?: React.ReactElement;
}

//  Ad Container
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

// main

function GamesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const [searchQuery,    setSearchQuery]    = useState<string>("");
  const [submittedQuery, setSubmittedQuery] = useState<string>("");
  const [showAds, setShowAds] = useState<boolean>(false);

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


  const FEED_DATA = useMemo<FeedItem[]>(
    () => [
      { id: "header",           type: "COMPONENT", component: <Text style={styles.headerText}>{t("games.screen.header")}</Text> },
      { id: "free_games",       type: "COMPONENT", component: <FreeGames /> },
      { id: "news",             type: "COMPONENT", component: <GamesNews /> },
      { id: "ad_1",             type: "AD" },
      { id: "popular",          type: "COMPONENT", component: <Popular /> },
      { id: "recently_released",type: "COMPONENT", component: <RecentlyReleased /> },
      { id: "ad_2",             type: "AD" },
      { id: "coming_soon",      type: "COMPONENT", component: <ComingSoon /> },
      { id: "anticipated",      type: "COMPONENT", component: <MostAnticipated /> },
      { id: "ad_3",             type: "AD" },
      { id: "nostalgia",        type: "COMPONENT", component: <NostalgiaCorner /> },
      { id: "top_rated",        type: "COMPONENT", component: <TopRated /> },
    ],
    []
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.type === "AD") return showAds ? <AdContainer /> : null;
      return <View>{item.component}</View>;
    },
    [showAds]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("games.screen.searchPlaceholder")}
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

      {submittedQuery !== "" ? (
        <View style={{ flex: 1 }}>
          <GamesList query={submittedQuery} endpoint="" header="" />
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
    </SafeAreaView>
  );
}

export default GamesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e2a45",
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingBottom: 2,
    marginTop: 10,
    borderRadius: 24,
    marginHorizontal: 50,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
  headerText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    backgroundColor: COLORS.secondary,
    textAlign: "center",
    paddingVertical: 8,
    borderRadius: 8,
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
