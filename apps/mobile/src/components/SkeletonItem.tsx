import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/src/hooks/useTheme";

interface SkeletonItemProps {
  style?: ViewStyle;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

/**
 * Shared skeleton placeholder block with a LinearGradient fill.
 * Pair with `usePulseAnimation()` from `./skeleton/shared` for the standard
 * pulse effect.
 */
const SkeletonItem = React.memo<SkeletonItemProps>(
  ({ style, animatedStyle }) => {
    const colors = useThemeColors();

    return (
      <Animated.View
        style={[
          styles.base,
          { backgroundColor: colors.skeletonBase },
          style,
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[colors.skeletonBase, colors.skeletonHighlight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  },
);

SkeletonItem.displayName = "SkeletonItem";
export default SkeletonItem;

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
