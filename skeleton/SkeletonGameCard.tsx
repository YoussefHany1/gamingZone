import React from "react";
import { View, StyleSheet } from "react-native";
import COLORS from "../constants/colors";
import Shimmer from "./Shimmer";
import { useShimmerSweep } from "./shared";

const SkeletonGameCard: React.FC = () => {
  const animatedStyle = useShimmerSweep();

  return (
    <View style={styles.cardContainer}>
      {/* Game cover image placeholder */}
      <View style={styles.coverPlaceholder}>
        <Shimmer animatedStyle={animatedStyle} />
      </View>

      {/* Game title placeholder */}
      <View style={styles.titlePlaceholder} />
    </View>
  );
};

export default React.memo(SkeletonGameCard);

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    padding: 10,
    borderRadius: 16,
    margin: 10,
    backgroundColor: COLORS.secondary + "20",
    height: 270,
    width: 160,
  },
  coverPlaceholder: {
    width: 140,
    height: 190,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    overflow: "hidden",
    marginBottom: 16,
  },
  titlePlaceholder: {
    width: 100,
    height: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
});
