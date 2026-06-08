import React, { useRef, useEffect, memo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  I18nManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ComponentProps } from "react";
import { useTabBarStore } from "../store/useTabBarStore";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_ICON_MAP: Record<string, [IoniconName, IoniconName]> = {
  Home: ["home", "home-outline"],
  News: ["newspaper", "newspaper-outline"],
  Games: ["game-controller", "game-controller-outline"],
  Settings: ["settings", "settings-outline"],
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_WIDTH = SCREEN_WIDTH - 32;
const TAB_COUNT = 4;
const TAB_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;

// ── Palette ───────────────────────────────────────────────────────────────────
const GLASS_BG = "rgba(0, 0, 28, 0.45)"; // #00001c tint
const GLASS_BORDER = "rgba(119, 155, 221, 0.25)";
const PILL_START = "rgba(119, 155, 221, 0.35)";
const PILL_END = "rgba(119, 155, 221, 0.05)";
const PILL_BORDER = "rgba(119, 155, 221, 0.4)";
const SPEC_START = "rgba(255, 255, 255, 0.15)";
const SPEC_END = "rgba(255, 255, 255, 0.00)";
const ICON_ACTIVE = "#ffffff";
const ICON_INACTIVE = "rgba(119, 155, 221, 0.7)";

const TAB_SPRING_CONFIG = {
  stiffness: 140,
  damping: 15,
  mass: 0.8,
};

const isRTL = I18nManager.isRTL;
const rtlMultiplier = isRTL ? -1 : 1;

const LiquidGlassTabBar = memo(
  ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const indicatorAnim = useRef(
      new Animated.Value(state.index * TAB_WIDTH * rtlMultiplier),
    ).current;

    const isVisible = useTabBarStore((state) => state.isVisible);
    const translateY = useRef(new Animated.Value(0)).current;

    const scaleAnims = useRef(
      state.routes.map(
        (_, i) => new Animated.Value(i === state.index ? 1.18 : 1),
      ),
    ).current;
    const glowAnims = useRef(
      state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0)),
    ).current;

    useEffect(() => {
      Animated.spring(translateY, {
        toValue: isVisible ? 0 : 150, // 150 moves it off-screen downwards
        useNativeDriver: true,
        stiffness: 140,
        damping: 18,
        mass: 1,
      }).start();
    }, [isVisible, translateY]);

    useEffect(() => {
      Animated.spring(indicatorAnim, {
        toValue: state.index * TAB_WIDTH * rtlMultiplier,
        useNativeDriver: true,
        ...TAB_SPRING_CONFIG,
      }).start();

      state.routes.forEach((_, i) => {
        const focused = i === state.index;
        Animated.parallel([
          Animated.spring(scaleAnims[i], {
            toValue: focused ? 1.18 : 1,
            useNativeDriver: true,
            ...TAB_SPRING_CONFIG,
          }),
          Animated.timing(glowAnims[i], {
            toValue: focused ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, [state.index]);

    return (
      <Animated.View
        style={[styles.wrapper, { transform: [{ translateY }] }]}
        pointerEvents={isVisible ? "box-none" : "none"}
      >
        {/* ── Main glass pill bar ── */}
        <View style={styles.bar}>
          {/* Base Blur */}
          <BlurView
            experimentalBlurMethod="dimezisBlurView"
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          {/* Base dark fill */}
          <View style={[StyleSheet.absoluteFill, styles.baseFill]} />

          {/* Glass reflection overlay */}
          <LinearGradient
            colors={["rgba(119,155,221,0.12)", "rgba(0,0,28,0.05)", "rgba(0,0,28,0)"]}
            locations={[0, 0.4, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Top specular highlight — glass refraction edge */}
          <LinearGradient
            colors={[SPEC_START, SPEC_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.specular}
          />

          {/* Outer border */}
          <View style={[StyleSheet.absoluteFill, styles.barBorder]} />

          {/* ── Sliding pill indicator ── */}
          <Animated.View
            style={[
              styles.pill,
              {
                width: TAB_WIDTH - 14,
                transform: [{ translateX: indicatorAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[PILL_START, PILL_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.pillRadius]}
            />
            <LinearGradient
              colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.00)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.pillShine, styles.pillRadius]}
            />
            <View style={[StyleSheet.absoluteFill, styles.pillBorder]} />
          </Animated.View>

          {/* ── Tab items ── */}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const [focusedIcon, unfocusedIcon] = TAB_ICON_MAP[route.name] ?? [
              "ellipse",
              "ellipse-outline",
            ];

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

            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.75}
                style={styles.tabItem}
              >
                <Animated.View
                  style={[
                    styles.iconGlow,
                    {
                      opacity: glowAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.06, 0.22],
                      }),
                      transform: [
                        {
                          scale: glowAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.85, 1.05],
                          }),
                        },
                      ],
                    },
                  ]}
                />

                {/* Centered Icon */}
                <Animated.View
                  style={{ transform: [{ scale: scaleAnims[index] }] }}
                >
                  <Ionicons
                    name={isFocused ? focusedIcon : unfocusedIcon}
                    size={23}
                    color={isFocused ? ICON_ACTIVE : ICON_INACTIVE}
                  />
                </Animated.View>

                {/* Small dot below icon when active */}
                <Animated.View
                  style={[
                    styles.activeDot,
                    {
                      opacity: glowAnims[index],
                      transform: [{ scale: glowAnims[index] }],
                    },
                  ]}
                />
              </TouchableOpacity>
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
    bottom: 12,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    width: TAB_BAR_WIDTH,
    height: 64,
    borderRadius: 34,
    overflow: "hidden",
    alignItems: "center",
    backgroundColor: "transparent",
    elevation: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 22,
  },
  baseFill: {
    backgroundColor: GLASS_BG,
    borderRadius: 34,
  },
  specular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  barBorder: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  pill: {
    position: "absolute",
    left: 7,
    top: 9,
    height: 46,
    zIndex: 0,
  },
  pillRadius: {
    borderRadius: 23,
  },
  pillShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
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
  iconGlow: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(119,155,221,0.18)",
    top: 11,
    left: (TAB_WIDTH - 42) / 2,
  },
  activeDot: {
    position: "absolute",
    bottom: 8,
    left: (TAB_WIDTH - 4) / 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ICON_ACTIVE,
  },
});
