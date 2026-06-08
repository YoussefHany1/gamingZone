import React, { useMemo, useEffect, useState, useCallback, memo, useRef } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Text,
  InteractionManager,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
import Slideshow from "../components/home/Slideshow";
import LatestNews from "../components/LatestNews";
import WeeklySummary from "../components/home/WeeklySummary";
import GamingEvents from "../components/home/Gamingevents";
import { useScrollDirection } from "../hooks/useScrollDirection";

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
  const { onScroll } = useScrollDirection();

  const noopChangeFeed = useCallback(() => {}, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() =>
      setShowAds(true),
    );
    return () => task.cancel();
  }, []);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

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
          return <Slideshow />;
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
              scrollEnabled={false}
            />
          );
        case "weekly_summary":
          return <WeeklySummary />;
        case "events":
          return <GamingEvents />;
        case "ad":
          return showAds ? <AdBanner /> : null;
        default:
          return null;
      }
    },
    [showAds, currentLang],
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
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 90 }}
      />

      <Animated.View style={[homeStyles.fabWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={homeStyles.fabGlass}
          onPress={() => navigation.navigate("AIChatScreen")}
          activeOpacity={0.8}
        >
          <BlurView
            experimentalBlurMethod="dimezisBlurView"
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, homeStyles.fabBaseFill]} />
          <LinearGradient
            colors={["rgba(12,26,51,0.72)", "rgba(0,0,28,0.90)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.18)", "rgba(255, 255, 255, 0.00)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={homeStyles.fabSpecular}
          />
          <View style={[StyleSheet.absoluteFill, homeStyles.fabBorder]} />
          <Ionicons name="chatbubbles" size={28} color="#fff" style={{ zIndex: 1 }} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

export default HomeScreen;

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 55,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
  fabWrapper: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    elevation: 28,
    shadowColor: "#779bdd",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
  },
  fabGlass: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fabBaseFill: {
    backgroundColor: "rgba(4, 8, 30, 0.4)",
    borderRadius: 30,
  },
  fabSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  fabBorder: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(119, 155, 221, 0.28)",
  },
});
