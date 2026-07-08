import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  SKELETON_BASE_COLOR,
  SKELETON_HIGHLIGHT_COLOR,
} from "./skeleton/shared";

interface SkeletonItemProps {
  style?: ViewStyle;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

/**
 * Shared skeleton placeholder block with a LinearGradient fill.
 * Pair with `usePulseAnimation()` from `./shared` for the standard pulse effect.
 */
const SkeletonItem = React.memo<SkeletonItemProps>(
  ({ style, animatedStyle }) => (
    <Animated.View style={[styles.base, style, animatedStyle]}>
      <LinearGradient
        colors={[SKELETON_BASE_COLOR, SKELETON_HIGHLIGHT_COLOR]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  ),
);

SkeletonItem.displayName = "SkeletonItem";
export default SkeletonItem;

const styles = StyleSheet.create({
  base: {
    backgroundColor: SKELETON_BASE_COLOR,
    overflow: "hidden",
  },
});
