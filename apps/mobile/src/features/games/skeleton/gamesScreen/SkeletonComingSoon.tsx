import React from "react";
import { View, StyleSheet } from "react-native";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";

const CARD_WIDTH = 300;
const CARD_HEIGHT = 350;
const CARD_MARGIN = 10;
const CARD_BG_COLOR = "#1a3052";

const SkeletonComingSoonCard: React.FC = () => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={styles.cardContainer}>
      {/* Date calendar skeleton */}
      <SkeletonItem
        animatedStyle={animatedStyle}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: 55,
          height: 60,
          borderRadius: 12,
          zIndex: 10,
        }}
      />

      <View style={styles.contentContainer}>
        {/* Cover image skeleton */}
        <View style={styles.coverContainer}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.cover} />
        </View>

        {/* Info container */}
        <View style={styles.infoContainer}>
          {/* Title line */}
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={{ width: 200, height: 22, borderRadius: 4, marginBottom: 8 }}
          />

          {/* Platform badges */}
          <View style={styles.platformsContainer}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={styles.platformBadge}
            />
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={styles.platformBadge}
            />
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={styles.platformBadge}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default React.memo(SkeletonComingSoonCard);

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: CARD_BG_COLOR,
    overflow: "hidden",
    position: "relative",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  coverContainer: {
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cover: {
    width: 140,
    height: 200,
    borderRadius: 16,
  },
  infoContainer: {
    alignItems: "center",
    width: "100%",
  },
  platformsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  platformBadge: {
    width: 50,
    height: 24,
    borderRadius: 12,
  },
});
