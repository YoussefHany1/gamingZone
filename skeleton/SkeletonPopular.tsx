import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import COLORS from "../constants/colors";
import Shimmer from "./Shimmer";
import { useShimmerSweep } from "./shared";

const { width } = Dimensions.get("window");

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;

const SkeletonPopular: React.FC = () => {
  const animatedStyle = useShimmerSweep();

  return (
    <View style={styles.cardContainer}>
      {/* Game cover image placeholder */}
      <View style={styles.coverContainer}>
        <View style={styles.coverPlaceholder}>
          {/* The shimmer overlay is intentionally wider than the card to ensure
              the sweep is visible even at the edges of the container. */}
          <Shimmer animatedStyle={animatedStyle} style={{ width: width * 1.5 }} />
        </View>
      </View>

      {/* Game title placeholder */}
      <View style={styles.titlePlaceholder} />

      {/* Game stats placeholders */}
      <View style={styles.statsContainer}>
        <View style={styles.statPlaceholder} />
        <View style={styles.statPlaceholder} />
      </View>
    </View>
  );
};

export default React.memo(SkeletonPopular);

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.primary,
    marginHorizontal: 5,
  },
  coverContainer: {
    width: "100%",
    height: 180,
    overflow: "hidden",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondary,
    overflow: "hidden",
  },
  titlePlaceholder: {
    height: 24,
    backgroundColor: COLORS.secondary + "80",
    margin: 8,
    borderRadius: 4,
    marginBottom: 8,
    width: "85%",
  },
  statsContainer: {
    paddingHorizontal: 8,
    gap: 6,
  },
  statPlaceholder: {
    height: 16,
    backgroundColor: COLORS.secondary + "50",
    borderRadius: 4,
    width: "75%",
  },
});
