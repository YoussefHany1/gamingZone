import React from "react";
import { View, StyleSheet } from "react-native";
import COLORS from "../constants/colors";
import SkeletonItem from "./SkeletonItem";
// usePulseAnimation(0.4, 0.8) gives the vintage card a subtler, dimmer pulse
// that preserves the original intentional aesthetic difference.
import { usePulseAnimation } from "./shared";

const CARD_WIDTH = 165; // Matches width * 0.55 at typical phone width
const CARD_HEIGHT = 360;
const CARD_MARGIN = 10;

const FRAME_BORDER_COLOR = "#1f3a60";

const SkeletonNostalgiaCard: React.FC = () => {
  // Dimmer pulse (0.4–0.8) to preserve the vintage card's subdued aesthetic
  const animatedStyle = usePulseAnimation(0.4, 0.8);

  return (
    <View style={styles.gameCard}>
      {/* Card background */}
      <View style={styles.paperBackground} />

      {/* Outer decorative frame */}
      <View style={styles.outerFrame}>
        {/* Decade badge */}
        <SkeletonItem animatedStyle={animatedStyle} style={styles.decadeBadge} />

        {/* Cover image */}
        <View style={styles.coverFrame}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.cover} />
        </View>

        {/* Title ribbon */}
        <View style={styles.ribbonContainer}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.ribbonSkeleton} />
        </View>

        {/* Platform info */}
        <View style={styles.infoContainer}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.consoleSkeleton} />
        </View>

        {/* Decorative corner accents */}
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
      </View>
    </View>
  );
};

export default React.memo(SkeletonNostalgiaCard);

const styles = StyleSheet.create({
  gameCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    position: "relative",
  },
  paperBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#0c1a33",
  },
  outerFrame: {
    flex: 1,
    margin: 8,
    padding: 12,
    borderWidth: 3,
    borderColor: FRAME_BORDER_COLOR,
    borderRadius: 8,
    position: "relative",
  },
  decadeBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    width: 75,
    height: 32,
    borderRadius: 4,
  },
  coverFrame: {
    alignSelf: "center",
    marginTop: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: FRAME_BORDER_COLOR,
    borderRadius: 8,
  },
  cover: {
    width: 120,
    height: 160,
    borderRadius: 4,
  },
  ribbonContainer: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  ribbonSkeleton: {
    width: "90%",
    height: 28,
    borderRadius: 2,
  },
  infoContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 6,
  },
  consoleSkeleton: {
    width: 80,
    height: 24,
    borderRadius: 4,
  },
  cornerTopLeft: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 15,
    height: 15,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: FRAME_BORDER_COLOR,
  },
  cornerTopRight: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 15,
    height: 15,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: FRAME_BORDER_COLOR,
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 5,
    left: 5,
    width: 15,
    height: 15,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: FRAME_BORDER_COLOR,
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 15,
    height: 15,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: FRAME_BORDER_COLOR,
  },
});
