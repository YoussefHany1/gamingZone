import React from "react";
import { View, StyleSheet } from "react-native";
import COLORS from "@/src/constants/colors";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_MARGIN = 5;
const CARD_BG_COLOR = COLORS.primary;

const SkeletonTopRatedCard: React.FC = () => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={styles.cardContainer}>
      {/* Cover image */}
      <View style={styles.coverContainer}>
        <SkeletonItem
          animatedStyle={animatedStyle}
          style={styles.coverSkeleton}
        />
      </View>

      {/* Info container */}
      <View style={styles.infoContainer}>
        {/* Title area */}
        <View>
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={{
              width: "90%",
              height: 18,
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: "40%", height: 18, borderRadius: 4 }}
            />
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: 40, height: 18, borderRadius: 8 }}
            />
          </View>
        </View>

        {/* Rating area */}
        <View style={styles.ratingContainer}>
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={styles.ratingCircle}
          />
          <View style={styles.genresContainer}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{
                width: 70,
                height: 20,
                borderRadius: 12,
                marginBottom: 4,
              }}
            />
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: 50, height: 20, borderRadius: 12 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default React.memo(SkeletonTopRatedCard);

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 20,
    backgroundColor: CARD_BG_COLOR,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  coverContainer: {
    width: "100%",
    height: 160,
  },
  coverSkeleton: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  ratingCircle: {
    width: 55,
    height: 55,
    borderRadius: 33,
  },
  genresContainer: {
    flexDirection: "column",
    gap: 2,
  },
});
