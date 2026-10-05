import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useIsDark, useThemeColors } from "@/src/hooks/useTheme";
import type { ShimmerPlaceholderProps } from "../types";

const { width } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// ShimmerPlaceholder — each instance runs its own animation so sweeps are
// independent of each other in the list.
// ---------------------------------------------------------------------------

const ShimmerPlaceholder = React.memo<ShimmerPlaceholderProps>(({ style }) => {
  const translateX = useSharedValue(-width);
  const fills = usePlaceholderColors();

  useEffect(() => {
    // react-native-reanimated always runs on the UI thread (native driver active)
    translateX.value = withRepeat(
      withTiming(width, { duration: 1250, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        staticStyles.placeholderBase,
        { backgroundColor: fills.placeholderBase },
        style,
        { overflow: "hidden" },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[...fills.shimmer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
});

ShimmerPlaceholder.displayName = "ShimmerPlaceholder";

// ---------------------------------------------------------------------------
// SkeletonItem — a single list row placeholder
// ---------------------------------------------------------------------------

const SkeletonItem = React.memo(() => {
  const fills = usePlaceholderColors();

  return (
    <View
      style={[
        staticStyles.skeletonContainer,
        { backgroundColor: fills.skeletonContainer },
      ]}
    >
      {/* Game cover image placeholder */}
      <ShimmerPlaceholder style={staticStyles.skeletonImage} />

      {/* Text info placeholders */}
      <View style={staticStyles.skeletonInfo}>
        <ShimmerPlaceholder style={staticStyles.skeletonTitle} />
        <ShimmerPlaceholder style={staticStyles.skeletonDate} />
      </View>

      {/* Delete icon placeholder */}
      <ShimmerPlaceholder style={staticStyles.skeletonIcon} />
    </View>
  );
});

SkeletonItem.displayName = "SkeletonItem";

// ---------------------------------------------------------------------------
// Main — UserGamesSkeleton
// ---------------------------------------------------------------------------

const DUMMY_COUNT = 4;
const DUMMY_DATA = Array.from({ length: DUMMY_COUNT }, (_, i) => i);

const UserGamesSkeleton: React.FC = () => (
  <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
    <FlashList
      data={DUMMY_DATA}
      keyExtractor={(item) => item.toString()}
      renderItem={() => <SkeletonItem />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    />
  </SafeAreaView>
);

export default React.memo(UserGamesSkeleton);

// Placeholder fills follow the active theme, so they are applied as values on
// top of the static geometry sheet.
const usePlaceholderColors = () => {
  const colors = useThemeColors();
  const isDark = useIsDark();
  return {
    placeholderBase: colors.accentSurface,
    skeletonContainer: colors.surface,
    shimmer: [
      "transparent",
      isDark ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.85)",
      "transparent",
    ] as const,
  };
};

const staticStyles = StyleSheet.create({
  placeholderBase: {},
  skeletonContainer: {
    flexDirection: "row",
    borderRadius: 12,
    marginTop: 24,
    padding: 10,
    alignItems: "center",
  },
  skeletonImage: {
    width: 80,
    height: 105,
    borderRadius: 8,
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  skeletonTitle: {
    width: "70%",
    height: 20,
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonDate: {
    width: "40%",
    height: 14,
    borderRadius: 4,
  },
  skeletonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 8,
  },
});
