import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useWindowDimensions, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabView, TabBar, type SceneRendererProps, type NavigationState } from "react-native-tab-view";
import LatestNews from "../components/LatestNews";
import Loading from "../Loading";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";
import useRssFeeds, { type RssFeedMap, type RssSource } from "../hooks/useRssFeeds";

// Types
interface RouteShape { key: string; title: string }

interface GenericNewsRouteProps {
  rssFeeds: RssFeedMap;
  categoryKey: string;
  loading: boolean;
}

// GenericNewsRoute

const GenericNewsRoute = memo<GenericNewsRouteProps>(({ rssFeeds, categoryKey, loading }) => {
  const { i18n, t } = useTranslation();

  const feedList = useMemo<RssSource[]>(() => {
    const list = rssFeeds[categoryKey] ?? [];
    const arList = list.filter((item) => item.language === "ar").sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const enList = list.filter((item) => item.language !== "ar").sort((a, b) => a.name.localeCompare(b.name, "en"));
    return i18n.language === "ar" ? [...arList, ...enList] : [...enList, ...arList];
  }, [rssFeeds, categoryKey, i18n.language]);

  const [selected, setSelected] = useState<RssSource | undefined>(feedList[0]);

  useEffect(() => {
    if ((!selected || !feedList.find((f) => f.name === selected.name)) && feedList.length > 0) {
      setSelected(feedList[0]);
    }
  }, [feedList, selected]);

  if (selected) {
    return (
      <View style={styles.scene}>
        <LatestNews
          website={selected.name}
          category={categoryKey}
          selectedItem={selected}
          language={selected.language ?? "en"}
          websitesList={feedList}
          onChangeFeed={setSelected}
          limit={20}
          showDropdown={true}
        />
      </View>
    );
  }
  if (loading && feedList.length === 0) {
    return <View style={styles.scene}><Loading /></View>;
  }
  return (
    <View style={styles.scene}>
      <Text style={styles.noDataText}>{t("common.noInternet")}</Text>
    </View>
  );
});
GenericNewsRoute.displayName = "GenericNewsRoute";

// ─── Screen ───────────────────────────────────────────────────────────────────

function NewsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState<number>(0);
  const { rssFeeds, loading } = useRssFeeds();

  const routes = useMemo<RouteShape[]>(() => [
    { key: "news", title: t("news.tabs.news") ?? "News" },
    { key: "reviews", title: t("news.tabs.reviews") ?? "Reviews" },
    { key: "esports", title: t("news.tabs.esports") ?? "Esports" },
    { key: "hardware", title: t("news.tabs.hardware") ?? "Hardware" },
  ], [t]);

  /**
   * ✅ useCallback([]) — TabBar styles never change at runtime;
   *    a stable reference prevents TabView from re-rendering the tab bar.
   */
  const renderTabBar = useCallback(
    (props: SceneRendererProps & { navigationState: NavigationState<RouteShape> }) => (
      <TabBar {...props}
        style={styles.tabBar}
        indicatorStyle={styles.tabIndicator}
        activeColor={COLORS.secondary}
        inactiveColor="#a9b7d0"
      />
    ),
    []
  );

  /**
   * ✅ useCallback([rssFeeds, loading]) — only recreated when feed data changes.
   */
  const renderScene = useCallback(
    ({ route }: { route: RouteShape }) => (
      <GenericNewsRoute rssFeeds={rssFeeds} categoryKey={route.key} loading={loading} />
    ),
    [rssFeeds, loading]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        lazy
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />
    </SafeAreaView>
  );
}
export default NewsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBackground,
  },
  scene: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    backgroundColor: COLORS.darkBackground,
  },
  tabIndicator: {
    backgroundColor: COLORS.secondary,
  },
  tabLabel: {
    // color: "#a9b7d0",
    fontSize: 16,
    fontWeight: "600",
  },
  noDataText: { color: COLORS.textLight },
});
