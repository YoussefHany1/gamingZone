import React from "react";
import { View, StyleSheet } from "react-native";
import COLORS from "../constants/colors";
import SkeletonItem from "./SkeletonItem";
import { usePulseAnimation } from "./shared";

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 5;
const CARD_BG_COLOR = COLORS.primary;

const SkeletonFreeGames: React.FC = () => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={styles.cardContainer}>
      {/* Image container */}
      <View style={styles.imageContainer}>
        <SkeletonItem animatedStyle={animatedStyle} style={styles.coverSkeleton} />

        {/* Store icon badge */}
        <SkeletonItem
          animatedStyle={animatedStyle}
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 2,
            borderColor: CARD_BG_COLOR,
          }}
        />
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        {/* Title lines */}
        <View style={{ alignItems: "center", gap: 6 }}>
          <SkeletonItem animatedStyle={animatedStyle} style={{ width: "90%", height: 14, borderRadius: 4 }} />
          <SkeletonItem animatedStyle={animatedStyle} style={{ width: "60%", height: 14, borderRadius: 4 }} />
        </View>

        {/* Claim button */}
        <SkeletonItem
          animatedStyle={animatedStyle}
          style={{ width: "100%", height: 36, borderRadius: 10, marginTop: 8 }}
        />
      </View>
    </View>
  );
};

export default React.memo(SkeletonFreeGames);

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 16,
    backgroundColor: CARD_BG_COLOR,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  coverSkeleton: {
    width: "100%",
    height: "100%",
  },
  infoSection: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
});