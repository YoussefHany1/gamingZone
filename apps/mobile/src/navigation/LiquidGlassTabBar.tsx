import { useEffect, memo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Gamepad2, House, Newspaper, Settings } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTabBarStore } from "../store/useTabBarStore";
import COLORS from "../constants/colors";

export const TAB_ROUTES = ["Home", "News", "Games", "Settings"] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];

const TAB_ICON_MAP: Record<TabRoute, LucideIcon> = {
  Home: House,
  News: Newspaper,
  Games: Gamepad2,
  Settings,
};

// ── Palette ───────────────────────────────────────────────────────────────────
const GLASS_BORDER = "rgba(119, 155, 221, 0.25)";
const PILL_START = "rgba(119, 155, 221, 0.35)";
const PILL_END = "rgba(119, 155, 221, 0.05)";
const PILL_BORDER = "rgba(119, 155, 221, 0.4)";
const ICON_ACTIVE = "#ffffff";
const ICON_INACTIVE = "rgba(119, 155, 221, 0.7)";

const TAB_SPRING_CONFIG = { stiffness: 140, damping: 15, mass: 0.8 };

const isRTL = I18nManager.isRTL;
const rtlMultiplier = isRTL ? -1 : 1;

// ── Per-tab animated icon ────────────────────────────────────────────────────
const TabIcon = memo(function TabIcon({
  route,
  isFocused,
  tabWidth,
  onPress,
}: {
  route: TabRoute;
  isFocused: boolean;
  tabWidth: number;
  onPress: () => void;
}) {
  const Icon = TAB_ICON_MAP[route];
  const iconColor = isFocused ? ICON_ACTIVE : ICON_INACTIVE;
  const iconScale = isFocused ? 1.18 : 1;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.tabItem}
    >
      <View collapsable={false} style={{ transform: [{ scale: iconScale }] }}>
        <Icon size={23} color={iconColor} accessible={false} />
      </View>
      {isFocused && <View style={[styles.activeDot, { left: (tabWidth - 4) / 2 }]} />}
    </TouchableOpacity>
  );
});
TabIcon.displayName = "TabIcon";

// ── Main tab bar ─────────────────────────────────────────────────────────────
import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";

const LiquidGlassTabBar = memo(
  ({ state, descriptors, navigation }: MaterialTopTabBarProps) => {
    const { width: screenWidth } = useWindowDimensions();
    const tabWidth = screenWidth / TAB_ROUTES.length;
    const isVisible = useTabBarStore((s) => s.isVisible);

    const indicatorX = useSharedValue(state.index * tabWidth * rtlMultiplier);
    const translateY = useSharedValue(0);

    useEffect(() => {
      translateY.value = withSpring(isVisible ? 0 : 150, {
        stiffness: 140,
        damping: 18,
        mass: 1,
      });
    }, [isVisible, translateY]);

    useEffect(() => {
      indicatorX.value = withSpring(
        state.index * tabWidth * rtlMultiplier,
        TAB_SPRING_CONFIG,
      );
    }, [state.index, tabWidth, indicatorX]);

    const wrapperStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const pillStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: indicatorX.value }],
    }));

    return (
      <Animated.View
        style={[styles.wrapper, wrapperStyle]}
        pointerEvents={isVisible ? "box-none" : "none"}
      >
        <View style={styles.bar}>
          <LinearGradient
            colors={["rgba(40, 54, 78, 1)", COLORS.darkBackground, COLORS.darkBackground]}
            locations={[0, 0.3, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={[StyleSheet.absoluteFill, styles.barBorder]} />

          <Animated.View
            style={[styles.pill, { width: tabWidth - 14, left: 7 }, pillStyle]}
          >
            <LinearGradient
              colors={[PILL_START, PILL_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.pillRadius]}
            />
            <View style={[StyleSheet.absoluteFill, styles.pillBorder]} />
          </Animated.View>

          {state.routes.map((route: { key: string; name: string }, index: number) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabIcon
                key={route.key}
                route={route.name as TabRoute}
                isFocused={isFocused}
                tabWidth={tabWidth}
                onPress={onPress}
              />
            );
          })}
        </View>
      </Animated.View>
    );
  },
);

LiquidGlassTabBar.displayName = "LiquidGlassTabBar";
export default LiquidGlassTabBar;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    width: "100%",
    height: 64,
    borderTopEndRadius: 34,
    borderTopStartRadius: 34,
    overflow: "hidden",
    alignItems: "center",
  },
  barBorder: {
    borderTopEndRadius: 34,
    borderTopStartRadius: 34,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  pill: {
    position: "absolute",
    top: 9,
    height: 46,
    zIndex: 0,
  },
  pillRadius: {
    borderRadius: 23,
  },
  pillBorder: {
    borderRadius: 23,
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  activeDot: {
    position: "absolute",
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ICON_ACTIVE,
  },
});
