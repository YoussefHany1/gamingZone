import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const CARD_WIDTH = 300;
const CARD_HEIGHT = 350;
const CARD_MARGIN = 10;

// ألوان الـ Skeleton
const SKELETON_BASE_COLOR = "#1f3a60";
const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";
const CARD_BG_COLOR = "#1a3052"; // لون خلفية الكارت

const SkeletonComingSoonCard = () => {
  // 1. إعداد الأنيميشن (Opacity Pulse)
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

  // مكون فرعي لرسم الأشكال
  const SkeletonItem = ({ style }) => (
    <Animated.View style={[styles.skeletonItem, style, animatedStyle]}>
      <LinearGradient
        colors={[SKELETON_BASE_COLOR, SKELETON_HIGHLIGHT_COLOR]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );

  return (
    <View style={styles.cardContainer}>
      {/* 1. Absolute Elements (Date & Hype) */}

      {/* Date Calendar Skeleton (Top Left) */}
      {/* يطابق top: 10, left: 10, width: 55 */}
      <SkeletonItem
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
      {/* 2. Main Content (Centered) */}
      <View style={styles.contentContainer}>
        {/* Cover Image Skeleton */}
        {/* يطابق width: 140, height: 200, marginBottom: 20 */}
        <View style={styles.coverContainer}>
          <SkeletonItem style={styles.cover} />
        </View>

        {/* Info Container */}
        <View style={styles.infoContainer}>
          {/* Title Lines (Centered) */}
          <SkeletonItem
            style={{ width: 200, height: 22, borderRadius: 4, marginBottom: 8 }}
          />

          {/* Platforms Row (Centered) */}
          <View style={styles.platformsContainer}>
            <SkeletonItem style={styles.platformBadge} />
            <SkeletonItem style={styles.platformBadge} />
            <SkeletonItem style={styles.platformBadge} />
          </View>
        </View>
      </View>
    </View>
  );
};

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
    justifyContent: "center", // لتوسيط المحتوى رأسياً
    alignItems: "center", // لتوسيط المحتوى أفقياً
  },
  coverContainer: {
    marginBottom: 20,
    // Shadow simulation for the placeholder
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
    alignItems: "center", // توسيط النصوص
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
  skeletonItem: {
    backgroundColor: SKELETON_BASE_COLOR,
    overflow: "hidden",
  },
});

export default SkeletonComingSoonCard;
