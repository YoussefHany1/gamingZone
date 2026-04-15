import React, { useMemo, useEffect, useState, useCallback, memo } from "react";
import { FlatList, StyleSheet, View, Text, InteractionManager, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
import Slideshow from "../components/home/Slideshow";
import LatestNews from "../components/LatestNews";
import WeeklySummary from "../components/home/WeeklySummary";
import GamingEvents from "../components/home/Gamingevents";

// Types
type SectionType = "slideshow" | "news" | "weekly_summary" | "events" | "ad";
interface SectionItem {
  type: SectionType;
  category?: string;
  website?: string;
  _key: string;
}

//  Ad Banner
const AdBanner = memo(() => {
  const { t } = useTranslation();
  return (
    <View style={homeStyles.ad}>
      <Text style={homeStyles.adText}>{t("common.ad")}</Text>
      <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
    </View>
  );
});
AdBanner.displayName = "AdBanner";

// main
function HomeScreen(): React.ReactElement {
  const [showAds, setShowAds] = useState<boolean>(false);
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const currentLang = i18n.language;

  const noopChangeFeed = useCallback(() => { }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  const sectionsData = useMemo<SectionItem[]>(() => {
    const website = currentLang === "en" ? "destructoid" : "true gaming";
    return [
      { type: "slideshow", website, category: "news", _key: "slideshow" },
      { type: "news", category: "news", _key: "news_0" },
      { type: "weekly_summary", _key: "weekly" },
      { type: "ad", _key: "ad_0" },
      { type: "news", category: "reviews", _key: "news_1" },
      { type: "events", _key: "events" },
      { type: "ad", _key: "ad_1" },
      { type: "news", category: "esports", _key: "news_2" },
      { type: "ad", _key: "ad_2" },
      { type: "news", category: "hardware", _key: "news_3" },
    ];
  }, [currentLang]);

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      switch (item.type) {
        case "slideshow":
          return <Slideshow website={item.website!} category={item.category!} />;
        case "news":
          return (
            <LatestNews
              category={item.category!}
              limit={4}
              showDropdown={false}
              language={currentLang}
              showFooter={false}
              website={item.website}
              selectedItem={null}
              onChangeFeed={noopChangeFeed}
              websitesList={[]}
            />
          );
        case "weekly_summary": return <WeeklySummary />;
        case "events": return <GamingEvents />;
        case "ad": return showAds ? <AdBanner /> : null;
        default: return null;
      }
    },
    [showAds, currentLang]
  );

  return (
    <SafeAreaView edges={["right", "left"]} style={homeStyles.container}>
      <FlatList
        data={sectionsData}
        renderItem={renderItem}
        keyExtractor={(item) => item._key}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={10}
      />

      <TouchableOpacity
        style={homeStyles.fab}
        onPress={() => navigation.navigate("AIChatScreen")}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default HomeScreen;

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 55
  },
  adText: {
    color: "#fff",
    marginBottom: 10
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});