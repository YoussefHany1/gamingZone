import { memo } from "react";
import { View } from "react-native";
import { TabBar } from "react-native-tab-view";
import type {
  NavigationState,
  SceneRendererProps,
  TabDescriptor,
} from "react-native-tab-view";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SocialSegment } from "../../lib/socialList";
import type { SocialRouteShape } from "../../types";

/** Props for the social tab bar (mirrors the shape `TabView` passes to renderTabBar). */
export type SocialTabBarProps = SceneRendererProps & {
  navigationState: NavigationState<SocialRouteShape>;
  counts: Record<SocialSegment, number>;
};

/**
 * Top tab bar for the social segments, with a themed label per route and the
 * badge counts the old in-page segment buttons showed (requests / chats /
 * sessions only — friends has no badge).
 */
const SocialTabBar = memo(function SocialTabBar(props: SocialTabBarProps) {
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
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSurface,
    },
    badgeText: { color: c.accentText, fontSize: 10, fontWeight: "800" },
  }));

  const options: Record<string, TabDescriptor<SocialRouteShape>> = {};
  props.navigationState.routes.forEach((route) => {
    const count = props.counts[route.key];
    options[route.key] = {
      label: ({ color }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <CustomText style={[styles.tabLabel, { color }]}>{route.title}</CustomText>
          {count > 0 && route.key !== "friends" && (
            <View style={styles.badge}>
              <CustomText style={styles.badgeText}>{count}</CustomText>
            </View>
          )}
        </View>
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

export default SocialTabBar;
