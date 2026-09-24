import React, { useMemo, useEffect, useState, useCallback, memo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MessagesSquare } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import { adUnitId } from "@/src/constants/config";
import Slideshow from "../components/Slideshow";
import WeeklySummary from "../components/WeeklySummary";
import LatestNews from "@/src/features/news/components/LatestNews";
import GamingEvents from "@/src/features/events/components/Gamingevents";
import RecommendedGames from "@/src/features/games/components/gamesScreen/RecommendedGames";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import type { SectionItem } from "../types";

// ─── DeferredSection ──────────────────────────────────────────────────────────
/**
 * Mounts `children` only after `delay` ms. Used to spread out the Home-screen
 * network fetches so they never all fire at once: a simultaneous burst
 * (slideshow + news feeds + weekly summary + recommended + events + ads)
 * starved the main- and render-threads on a low-end MediaTek device and
 * produced an input-dispatch ANR. Renders a fixed-height placeholder until
 * mounted so the page layout doesn't shift.
 */
const DeferredSection = memo(function DeferredSection({
  delay = 1000,
  placeholderHeight = 0,
  children,
}: {
  delay?: number | undefined;
  placeholderHeight?: number | undefined;
  children: React.ReactElement;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!mounted) {
    return <View style={{ height: placeholderHeight }} />;
  }

  return children;
});
DeferredSection.displayName = "DeferredSection";

// Each deferred news section receives a different delay so their setState
// calls never fire at the same time — no more "VirtualizedList slow to update".
const DeferredNewsSection = memo(function DeferredNewsSection({
  category,
  language,
  website,
  delay = 1000,
}: {
  category: string;
  language: string;
  website?: string | undefined;
  delay?: number | undefined;
}) {
  return (
    <DeferredSection delay={delay} placeholderHeight={280}>
      <NewsSection category={category} language={language} website={website} />
    </DeferredSection>
  );
});
DeferredNewsSection.displayName = "DeferredNewsSection";

// ─── Stable section wrappers ──────────────────────────────────────────────────

// Stable no-op defined at module scope so NewsSection's onChangeFeed prop
// is always referentially equal across renders.
const noop = () => {};

const AdBanner = memo(() => {
  const { t } = useTranslation();
  const adsEnabled = useAdsEnabled();
  const [showAds, setShowAds] = useState(false);

  useEffect(() => {
    const task = runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  if (!showAds || !adsEnabled) return null;
  return (
    <View style={homeStyles.ad}>
      <CustomText style={homeStyles.adText}>{t("common.ad")}</CustomText>
      <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
    </View>
  );
});
AdBanner.displayName = "AdBanner";

const NewsSection = memo(function NewsSection({
  category,
  language,
  website,
}: {
  category: string;
  language: string;
  website?: string | undefined;
}) {
  return (
    <LatestNews
      category={category}
      limit={4}
      showDropdown={false}
      showHeaderTitle={true}
      language={language}
      showFooter={false}
      website={website}
      selectedItem={undefined}
      onChangeFeed={noop}
      websitesList={[]}
      scrollEnabled={false}
    />
  );
});
NewsSection.displayName = "NewsSection";

const SlideshowSection = memo(function SlideshowSection() {
  return <Slideshow />;
});
SlideshowSection.displayName = "SlideshowSection";

const WeeklySummarySection = memo(function WeeklySummarySection() {
  return <WeeklySummary />;
});
WeeklySummarySection.displayName = "WeeklySummarySection";

const RecommendedGamesSection = memo(function RecommendedGamesSection() {
  return <RecommendedGames />;
});
RecommendedGamesSection.displayName = "RecommendedGamesSection";

const GamingEventsSection = memo(function GamingEventsSection() {
  return <GamingEvents />;
});
GamingEventsSection.displayName = "GamingEventsSection";

// ─── Section renderer (module-scope → never recreated) ────────────────────────
function renderSection(item: SectionItem, lang: string): React.ReactElement | null {
  switch (item.type) {
    case "slideshow":
      return <SlideshowSection key={item._key} />;
    case "news":
      if (!item.delay) {
        return (
          <NewsSection
            key={item._key}
            category={item.category!}
            language={lang}
            website={item.website}
          />
        );
      }
      return (
        <DeferredNewsSection
          key={item._key}
          category={item.category!}
          language={lang}
          website={item.website}
          delay={item.delay}
        />
      );
    case "weekly_summary":
      return (
        <DeferredSection key={item._key} delay={1100} placeholderHeight={230}>
          <WeeklySummarySection />
        </DeferredSection>
      );
    case "recommended":
      return (
        <DeferredSection key={item._key} delay={2200} placeholderHeight={300}>
          <RecommendedGamesSection />
        </DeferredSection>
      );
    case "events":
      return (
        <DeferredSection key={item._key} delay={3900} placeholderHeight={220}>
          <GamingEventsSection />
        </DeferredSection>
      );
    case "ad":
      return <AdBanner key={item._key} />;
    default:
      return null;
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function HomeScreen(): React.ReactElement {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const currentLang = i18n.language;
  const { onScroll } = useScrollDirection();

  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1600 }),
        withTiming(1, { duration: 1600 }),
      ),
      -1,
      false,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleRefresh = useCallback((): void => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    // Remounting the sections re-runs their staggered fetches; stop the
    // indicator after a short delay so it doesn't spin indefinitely.
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const sections = useMemo<SectionItem[]>(() => {
    const website = currentLang === "ar" ? "true gaming" : "destructoid";
    return [
      { type: "slideshow", website, category: "news", _key: `slideshow_${refreshKey}` },
      // ── Immediate (above the fold) ──────────────────────────────────────────
      { type: "news", category: "news", _key: `news_0_${currentLang}_${refreshKey}` },
      { type: "weekly_summary", _key: `weekly_${refreshKey}` },

      { type: "ad", _key: "ad_0" },
      // ── Staggered — spread the network burst so fetches never stack up ─────
      { type: "news", category: "reviews", delay: 1800, _key: `news_1_${currentLang}_${refreshKey}` },
      { type: "recommended", _key: `recommended_${refreshKey}` },

      { type: "ad", _key: "ad_1" },
      {
        type: "news",
        category: "esports",
        delay: 3200,
        _key: `news_2_${currentLang}_${refreshKey}`,
      },
      { type: "events", _key: `events_${refreshKey}` },
      { type: "ad", _key: "ad_2" },
      {
        type: "news",
        category: "hardware",
        delay: 4600,
        _key: `news_3_${currentLang}_${refreshKey}`,
      },
    ];
  }, [currentLang, refreshKey]);

  const renderedSections = useMemo(
    () => sections.map((item) => renderSection(item, currentLang)),
    [sections, currentLang],
  );

  return (
    <SafeAreaView edges={["right", "left"]} style={homeStyles.container}>
      {/*
        ScrollView replaces FlatList:
        - Only 10 fixed sections — virtualization adds overhead with zero benefit
        - Eliminates the "VirtualizedList: slow to update" warning entirely
        - All section components are memoized, so re-renders are already minimal
      */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
      >
        {renderedSections}
      </ScrollView>

      <Animated.View style={[homeStyles.fabWrapper, pulseStyle]}>
        <TouchableOpacity
          style={homeStyles.fabGlass}
          onPress={() => navigation.navigate("AIChatScreen")}
          activeOpacity={0.8}
        >
          <View style={[StyleSheet.absoluteFill, homeStyles.fabBaseFill]} />
          <LinearGradient
            colors={["rgba(12,26,51,0.72)", "rgba(0,0,28,0.90)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, homeStyles.fabBorder]} />
          <View collapsable={false}>
            <MessagesSquare size={28} color="#fff" style={{ zIndex: 1 }} />
          </View>
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
    elevation: 8,
    shadowColor: "#779bdd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  fabBorder: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(119, 155, 221, 0.28)",
  },
});
