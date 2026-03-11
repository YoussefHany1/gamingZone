import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../constants/colors";

// Card dimensions
const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_MARGIN = 5;

// Skeleton color palette
const SKELETON_BASE_COLOR = "#1f3a60";
const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";
const CARD_BG_COLOR = COLORS.primary;

// Types

interface SkeletonItemProps {
  style?: ViewStyle;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

// SkeletonItem

const SkeletonItem = React.memo<SkeletonItemProps>(({ style, animatedStyle }) => (
  <Animated.View style={[styles.skeletonItem, style, animatedStyle]}>
    <LinearGradient
      colors={[SKELETON_BASE_COLOR, SKELETON_HIGHLIGHT_COLOR]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  </Animated.View>
));

// Main

const SkeletonTopRatedCard: React.FC = () => {
  // Opacity pulse animation
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.cardContainer}>
      {/* Cover image skeleton */}
      <View style={styles.coverContainer}>
        <SkeletonItem animatedStyle={animatedStyle} style={styles.coverSkeleton} />
      </View>

      {/* Info container skeleton */}
      <View style={styles.infoContainer}>
        {/* Title area */}
        <View>
          {/* First title line */}
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={{ width: "90%", height: 18, borderRadius: 4, marginBottom: 6 }}
          />
          {/* Second title line (year badge) */}
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

        {/* Rating area (bottom) */}
        <View style={styles.ratingContainer}>
          {/* Rating circle skeleton */}
          <SkeletonItem animatedStyle={animatedStyle} style={styles.ratingCircle} />

          {/* Genre tags skeleton */}
          <View style={styles.genresContainer}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: 70, height: 20, borderRadius: 12, marginBottom: 4 }}
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
    // Subtle shadow to mimic the real card
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
    flex: 1, // remaining space: 320 - 160 = 160
    padding: 12,
    justifyContent: "space-between", // title top, rating bottom
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12, // matches marginBottom in the real card
  },
  ratingCircle: {
    width: 55,
    height: 55,
    borderRadius: 33, // half of (55 + some padding) for a circular shape
  },
  genresContainer: {
    flexDirection: "column",
    gap: 2,
  },
  skeletonItem: {
    backgroundColor: SKELETON_BASE_COLOR,
    overflow: "hidden",
  },
});