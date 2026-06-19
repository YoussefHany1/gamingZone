import React from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

interface SkeletonBarProps {
  shimmer: Animated.Value;
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single animated bar whose background colour pulses between two shades.
 * Driven by the `Animated.Value` returned from `useShimmer()`.
 *
 * Note: background-color interpolation is not supported by the native driver,
 * so `useNativeDriver: false` is used intentionally inside `useShimmer`.
 */
const SkeletonBar: React.FC<SkeletonBarProps> = ({
  shimmer,
  width = "100%",
  height = 16,
  radius = 8,
  style,
}) => {
  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(81,105,150,0.18)", "rgba(119,155,221,0.38)"],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, backgroundColor },
        style,
      ]}
    />
  );
};

export default SkeletonBar;
