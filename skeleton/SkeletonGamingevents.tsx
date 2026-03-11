import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;
const CARD_MARGIN = 10;

// Main

const SkeletonGamingEvents: React.FC = () => {
  const shimmerAnimation = useSharedValue(0);

  useEffect(() => {
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerAnimation.value,
      [0, 1],
      [-CARD_WIDTH, CARD_WIDTH],
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.eventCard}>
      {/* Base background skeleton */}
      <View style={styles.backgroundSkeleton} />

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={["rgba(12, 26, 51, 0.4)", "rgba(12, 26, 51, 0.95)"]}
        style={styles.gradientOverlay}
      />

      {/* Sliding shimmer overlay */}
      <Animated.View style={[styles.shimmerContainer, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmer}
        />
      </Animated.View>

      <View style={styles.contentContainer}>
        {/* Status badge skeleton */}
        <View style={styles.topRow}>
          <View style={styles.badgeSkeleton} />
        </View>

        {/* Info container */}
        <View style={styles.infoContainer}>
          {/* Event title skeleton */}
          <View style={styles.titleSkeletonContainer}>
            <View style={styles.titleSkeleton} />
            <View style={[styles.titleSkeleton, { width: "70%" }]} />
          </View>

          {/* Date & time row skeleton */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateSkeleton} />
            <View style={styles.countdownSkeleton} />
          </View>
        </View>
      </View>
    </View>
  );
};
export default React.memo(SkeletonGamingEvents);

const styles = StyleSheet.create({
  eventCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: COLORS.secondary,
  },
  backgroundSkeleton: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondary,
  },
  gradientOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  shimmer: {
    width: CARD_WIDTH,
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    zIndex: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeSkeleton: {
    width: 80,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
  },
  infoContainer: {
    gap: 8,
    justifyContent: "flex-end",
    flexGrow: 1,
    marginBottom: 14,
    marginLeft: 4,
  },
  titleSkeletonContainer: {
    gap: 6,
  },
  titleSkeleton: {
    width: "100%",
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dateSkeleton: {
    width: 120,
    height: 32,
    backgroundColor: COLORS.secondary + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray + "40",
  },
  countdownSkeleton: {
    width: 90,
    height: 32,
    backgroundColor: COLORS.secondary + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray + "40",
  },
});
