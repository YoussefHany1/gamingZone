import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;

// Internal card — uses its own hook instance so each card animates independently
const SkeletonCard: React.FC = () => {
  const animatedStyle = useShimmerSweep();

  const styles = useThemeStyles((c) => ({
    cardContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginHorizontal: 10,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: c.skeletonBase,
      elevation: 5,
    },
    backgroundSkeleton: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.skeletonHighlight,
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
      backgroundColor: c.skeletonHighlight,
      borderRadius: 4,
      marginBottom: 8,
    },
    countdownNumberSkeleton: {
      width: 50,
      height: 40,
      backgroundColor: c.skeletonHighlight,
      borderRadius: 50,
    },
    textWrapper: {
      marginBottom: 10,
      marginHorizontal: 10,
    },
    titleSkeleton: {
      width: "90%",
      height: 24,
      backgroundColor: c.skeletonHighlight,
      borderRadius: 6,
      marginBottom: 8,
    },
  }));

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

const SkeletonMostAnticipated: React.FC = () => {
  const styles = useThemeStyles((c) => ({
    container: {
      marginVertical: 10,
    },
    headerSkeleton: {
      width: 250,
      height: 32,
      backgroundColor: c.skeletonHighlight,
      marginLeft: 20,
      marginBottom: 15,
      borderRadius: 8,
    },
    listContent: {
      paddingHorizontal: 10,
      flexDirection: "row",
    },
  }));

  return (
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
};

export default React.memo(SkeletonMostAnticipated);
