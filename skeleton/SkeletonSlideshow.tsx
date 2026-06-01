import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");

// Main

const SlideshowSkeleton: React.FC = () => {
  // Horizontal translate value for the shimmer pass
  const translateX = useSharedValue(-width);

  // Infinite shimmer loop — sweeps left to right
  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }), // sweep from left to right
      -1, // infinite repetition
      false // always restart from the left (no reverse)
    );
  }, []);

  // Apply the animated transform
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.container}>
      {/* image placeholder */}
      <View style={styles.imagePlaceholder} />

      {/* text and cover layout matching the real Slideshow */}
      <View style={styles.headline}>
        {/* Cover image skeleton */}
        <View style={styles.coverSkeleton} />

        {/* Text lines skeleton */}
        <View style={styles.textContainer}>
          <View style={[styles.textLine, { width: "70%" }]} />
          <View style={styles.playRow}>
            <View style={styles.playIconSkeleton} />
            <View style={[styles.textLine, { width: "30%", height: 14 }]} />
          </View>
        </View>
      </View>

      {/* Animated shimmer overlay */}
      <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.15)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};
export default React.memo(SlideshowSkeleton);

const styles = StyleSheet.create({
  container: {
    height: 350,
    width: "100%",
    backgroundColor: COLORS.secondary,
    position: "relative",
    overflow: "hidden",
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
  },
  headline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  coverSkeleton: {
    width: 65,
    height: 90,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    opacity: 0.6,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  textLine: {
    height: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
    opacity: 0.6,
  },
  playRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  playIconSkeleton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.secondary,
    opacity: 0.6,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});


