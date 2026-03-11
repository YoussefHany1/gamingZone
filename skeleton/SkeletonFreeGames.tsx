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
const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
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
const SkeletonFreeGames: React.FC = () => {
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
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <SkeletonItem animatedStyle={animatedStyle} style={styles.coverSkeleton} />

        {/* Store icon badge placeholder */}
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
            borderColor: CARD_BG_COLOR, // simulates the badge border
          }}
        />
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        {/* Title lines */}
        <View style={{ alignItems: "center", gap: 6 }}>
          <SkeletonItem animatedStyle={animatedStyle} style={{ width: "90%", height: 14, borderRadius: 4 }} />
          <SkeletonItem animatedStyle={animatedStyle} style={{ width: "60%", height: 14, borderRadius: 4 }} />
        </View>

        {/* Claim button placeholder */}
        <SkeletonItem
          animatedStyle={animatedStyle}
          style={{
            width: "100%",
            height: 36,
            borderRadius: 10,
            marginTop: 8,
          }}
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
    // Subtle shadow
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
    flex: 1, // remaining space (~100px)
    padding: 12,
    justifyContent: "space-between", // distributes title and button
  },
  skeletonItem: {
    backgroundColor: SKELETON_BASE_COLOR,
    overflow: "hidden",
  },
});