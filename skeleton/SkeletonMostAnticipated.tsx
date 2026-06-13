import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../constants/colors";
import Shimmer from "./Shimmer";
import { useShimmerSweep } from "./shared";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;

// Internal card — uses its own hook instance so each card animates independently
const SkeletonCard: React.FC = () => {
  const animatedStyle = useShimmerSweep();

  return (
    <View style={styles.cardContainer}>
      {/* Background skeleton fill */}
      <View style={styles.backgroundSkeleton} />

      {/* Sliding shimmer overlay */}
      <Shimmer animatedStyle={animatedStyle} />

      {/* Countdown boxes skeleton */}
      <View style={styles.content}>
        <View style={styles.countdownRow}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.countdownBox}>
              <View style={styles.countdownHeaderSkeleton} />
              <View style={styles.countdownNumberSkeleton} />
            </View>
          ))}
        </View>
      </View>

      {/* Title skeleton */}
      <View style={styles.textWrapper}>
        <View style={styles.titleSkeleton} />
      </View>
    </View>
  );
};

const SkeletonMostAnticipated: React.FC = () => (
  <View style={styles.container}>
    {/* Section header skeleton */}
    <View style={styles.headerSkeleton} />

    {/* Card skeletons */}
    <View style={styles.listContent}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  </View>
);

export default React.memo(SkeletonMostAnticipated);

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerSkeleton: {
    width: 250,
    height: 32,
    backgroundColor: COLORS.secondary,
    marginLeft: 20,
    marginBottom: 15,
    borderRadius: 8,
  },
  listContent: {
    paddingHorizontal: 10,
    flexDirection: "row",
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.secondary + "50",
    elevation: 5,
  },
  backgroundSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.secondary + "50",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
  },
  countdownBox: {
    alignItems: "center",
  },
  countdownHeaderSkeleton: {
    width: 60,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 8,
  },
  countdownNumberSkeleton: {
    width: 50,
    height: 40,
    backgroundColor: COLORS.primary + "30",
    borderRadius: 50,
  },
  textWrapper: {
    marginBottom: 10,
    marginHorizontal: 10,
  },
  titleSkeleton: {
    width: "90%",
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 6,
    marginBottom: 8,
  },
});