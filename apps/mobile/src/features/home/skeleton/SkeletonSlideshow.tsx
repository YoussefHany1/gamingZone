import React from "react";
import { View, StyleSheet } from "react-native";
import COLORS from "@/src/constants/colors";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";

const SlideshowSkeleton: React.FC = () => {
  const animatedStyle = useShimmerSweep();

  return (
    <View style={styles.container}>
      {/* Full-screen background placeholder */}
      <View style={styles.imagePlaceholder} />

      {/* Bottom headline area — mirrors the real Slideshow layout */}
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

      {/* Shimmer overlay — sits on top of everything with zIndex: 10 */}
      <Shimmer animatedStyle={animatedStyle} style={styles.shimmerOverlay} />
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
    zIndex: 10,
  },
});
