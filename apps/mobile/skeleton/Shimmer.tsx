import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface ShimmerProps {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Optional extra styles applied to the animated overlay (e.g. `zIndex`). */
  style?: ViewStyle;
}

/**
 * Full-cover shimmer sweep overlay.
 * Pair with `useShimmerSweep()` from `./shared` for the standard left-to-right sweep.
 */
const Shimmer = React.memo<ShimmerProps>(({ animatedStyle, style }) => (
  <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, style]}>
    <LinearGradient
      colors={["transparent", "rgba(255,255,255,0.2)", "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  </Animated.View>
));

Shimmer.displayName = "Shimmer";
export default Shimmer;
