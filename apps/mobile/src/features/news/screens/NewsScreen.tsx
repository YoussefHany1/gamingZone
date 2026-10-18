import React, { useCallback, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabView } from "react-native-tab-view";
import type { NavigationState, SceneRendererProps } from "react-native-tab-view";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GenericNewsRoute from "../components/newsScreen/GenericNewsRoute";
import NewsTabBar from "../components/newsScreen/NewsTabBar";
import { useNewsTabs } from "../hooks/useNewsTabs";
import type { RouteShape } from "../types";

/** News tab: one lazy scene per category, sharing the RSS source list. */
function NewsScreen(): React.ReactElement {
  const layout = useWindowDimensions();
  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.backgroundDeep,
    },
  }));

  const { index, handleIndexChange, routes, rssFeeds, loading, error, refetch } =
    useNewsTabs();

  const navigationState: NavigationState<RouteShape> = useMemo(
    () => ({ index, routes }),
    [index, routes],
  );
  const initialLayout = useMemo(() => ({ width: layout.width }), [layout.width]);

  /**
   * Stable tab-bar renderer — the bar styles never change at runtime, so a
   * stable reference prevents TabView from re-rendering the bar.
   */
  const renderTabBar = useCallback(
    (props: SceneRendererProps & { navigationState: NavigationState<RouteShape> }) => (
      <NewsTabBar {...props} />
    ),
    [],
  );

  /** Recreated only when the feed data changes. */
  const renderScene = useCallback(
    ({ route }: { route: RouteShape }) => (
      <GenericNewsRoute
        rssFeeds={rssFeeds}
        categoryKey={route.key}
        loading={loading}
        error={error}
        refetch={refetch}
      />
    ),
    [rssFeeds, loading, error, refetch],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <TabView
        navigationState={navigationState}
        renderScene={renderScene}
        onIndexChange={handleIndexChange}
        lazy
        initialLayout={initialLayout}
        renderTabBar={renderTabBar}
      />
    </SafeAreaView>
  );
}

export default NewsScreen;
