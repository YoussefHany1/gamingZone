import React, { memo } from "react";
import { TabBar } from "react-native-tab-view";
import type { TabDescriptor } from "react-native-tab-view";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { NewsTabBarProps } from "./types";
import type { RouteShape } from "../../types";

/** Top tab bar for the news categories, with a themed label per route. */
const NewsTabBar = memo(function NewsTabBar(props: NewsTabBarProps) {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    tabBar: {
      backgroundColor: c.backgroundDeep,
    },
    tabIndicator: {
      backgroundColor: c.accent,
    },
    tabLabel: {
      textAlign: "center",
      fontWeight: "600",
    },
  }));

  const options: Record<string, TabDescriptor<RouteShape>> = {};
  props.navigationState.routes.forEach((route) => {
    options[route.key] = {
      label: ({ color }) => (
        <CustomText style={[styles.tabLabel, { color }]}>
          {route.title}
        </CustomText>
      ),
    };
  });

  return (
    <TabBar
      {...props}
      style={styles.tabBar}
      indicatorStyle={styles.tabIndicator}
      activeColor={colors.text}
      inactiveColor={colors.textMuted}
      options={options}
    />
  );
});

export default NewsTabBar;
