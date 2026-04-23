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

      {/* text line placeholders */}
      <View style={styles.textContainer}>
        <View style={[styles.textLine, { width: "80%" }]} />
        <View style={[styles.textLine, { width: "60%", marginTop: 8 }]} />
      </View>

      {/* Animated shimmer overlay */}
      <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.3)", "transparent"]}
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
  textContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: "flex-end",
    height: "30%",
    backgroundColor: COLORS.primary + "80",
  },
  textLine: {
    height: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
    alignSelf: "center",
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});


