import React from "react";
import Animated, {
  useAnimatedStyle,
  interpolateColor,
} from "react-native-reanimated";
import type { SkeletonBarProps } from "../../types";
/**
 * A single animated bar whose background colour pulses between two shades.
 * Driven by the `SharedValue<number>` returned from `useShimmer()`.
 *
 * Migrated from React Native's `Animated` (JS thread) to Reanimated
 * (UI thread). The color interpolation now runs entirely on the UI thread
 * via `interpolateColor` inside `useAnimatedStyle`.
 */
const SkeletonBar: React.FC<SkeletonBarProps> = ({
  shimmer,
  width = "100%",
  height = 16,
  radius = 8,
  style,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 1],
      ["rgba(81,105,150,0.18)", "rgba(119,155,221,0.38)"],
    ),
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius },
        animatedStyle,
        style,
      ]}
    />
  );
};

export default SkeletonBar;
