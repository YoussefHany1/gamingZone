import React from "react";
import { View, Dimensions } from "react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";

const { width } = Dimensions.get("window");

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;

const SkeletonPopular: React.FC = () => {
  const styles = useThemeStyles((c) => ({
    cardContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: c.background,
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
      backgroundColor: c.accent,
      overflow: "hidden",
    },
    titlePlaceholder: {
      height: 24,
      backgroundColor: c.accentSurface,
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
      backgroundColor: c.accentBorder,
      borderRadius: 4,
      width: "75%",
    },
  }));

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
