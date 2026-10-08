import { useEffect, memo, useMemo } from "react";
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
import { useIsDark, useThemeColors } from "@/src/hooks/useTheme";
import { mix, withAlpha } from "@/src/constants/colorUtils";

export const TAB_ROUTES = ["Home", "News", "Games", "Settings"] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];

const TAB_ICON_MAP: Record<TabRoute, LucideIcon> = {
  Home: House,
  News: Newspaper,
  Games: Gamepad2,
  Settings,
};

// ── Palette ───────────────────────────────────────────────────────────────────
// Derived from the active theme so the glass effect reads correctly on a light
// background. "active" is the color of the focused icon, used both for the
// active dot and as the unfocused-icon tint.
type TabPalette = ReturnType<typeof useTabPalette>;

const useTabPalette = () => {
  const colors = useThemeColors();
  const isDark = useIsDark();
  return useMemo(() => {
    // The glass tints are alpha variants of the palette's own accent colors,
    // so they follow style and accent changes instead of being frozen to the
    // original light/dark pair.
    const glow = colors.accentText;
    const solid = colors.accent;
    const tint = isDark ? glow : solid;

    return {
      glassBorder: colors.border,
      pillStart: withAlpha(tint, isDark ? 0.35 : 0.1),
      pillEnd: withAlpha(tint, isDark ? 0.05 : 0.02),
      pillBorder: withAlpha(tint, isDark ? 0.4 : 0.14),
      iconActive: colors.text,
      iconInactive: isDark ? withAlpha(glow, 0.7) : colors.textMuted,
      // A slightly lifted version of the bar's own background, so the top of
      // the bar reads as a highlight across every style.
      barTop: mix(colors.background, colors.text, isDark ? 0.14 : 0.05),
      barBottom: isDark ? colors.backgroundDeep : colors.background,
    };
  }, [colors, isDark]);
};

const TAB_SPRING_CONFIG = { stiffness: 140, damping: 15, mass: 0.8 };

const isRTL = I18nManager.isRTL;
const rtlMultiplier = isRTL ? -1 : 1;

// ── Per-tab animated icon ────────────────────────────────────────────────────
const TabIcon = memo(function TabIcon({
  route,
  isFocused,
  tabWidth,
  onPress,
  palette,
}: {
  route: TabRoute;
  isFocused: boolean;
  tabWidth: number;
  onPress: () => void;
  palette: TabPalette;
}) {
  const Icon = TAB_ICON_MAP[route];
  const iconColor = isFocused ? palette.iconActive : palette.iconInactive;
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
      {isFocused && (
        <View
          style={[
            styles.activeDot,
            { left: (tabWidth - 4) / 2, backgroundColor: palette.iconActive },
          ]}
        />
      )}
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
    const palette = useTabPalette();

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
            colors={[palette.barTop, palette.barBottom, palette.barBottom]}
            locations={[0, 0.3, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={[StyleSheet.absoluteFill, { borderColor: palette.glassBorder }]} />

          <Animated.View
            style={[styles.pill, { width: tabWidth - 14, left: 7 }, pillStyle]}
          >
            <LinearGradient
              colors={[palette.pillStart, palette.pillEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.pillRadius]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 23, borderWidth: 1, borderColor: palette.pillBorder },
              ]}
            />
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
                palette={palette}
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
  },
});
