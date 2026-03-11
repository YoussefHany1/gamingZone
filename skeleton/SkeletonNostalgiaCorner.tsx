import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;
const CARD_HEIGHT = 360;
const CARD_MARGIN = 10;

// Skeleton colors
const SKELETON_BASE_COLOR = "#1a3052";
const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";
const FRAME_BORDER_COLOR = "#1f3a60";

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
const SkeletonNostalgiaCard: React.FC = () => {
  // Opacity pulse animation
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.gameCard}>
      {/* Card background */}
      <View style={styles.paperBackground} />

      {/* Outer decorative frame */}
      <View style={styles.outerFrame}>
        {/* Decade badge skeleton */}
        <SkeletonItem animatedStyle={animatedStyle} style={styles.decadeBadge} />

        {/* Cover image skeleton */}
        <View style={styles.coverFrame}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.cover} />
        </View>

        {/* Title ribbon skeleton */}
        <View style={styles.ribbonContainer}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.ribbonSkeleton} />
        </View>

        {/* platform info skeleton */}
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
    backgroundColor: "#0c1a33", // primary background color
  },
  outerFrame: {
    flex: 1,
    margin: 8,
    padding: 12,
    borderWidth: 3,
    borderColor: FRAME_BORDER_COLOR, // subdued border color
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
  skeletonItem: {
    backgroundColor: SKELETON_BASE_COLOR,
    overflow: "hidden",
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
