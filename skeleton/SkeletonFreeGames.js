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
import COLORS from "../constants/colors";

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 5;

// ألوان الـ Skeleton (Dark Theme)
const SKELETON_BASE_COLOR = "#1f3a60";
const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";
const CARD_BG_COLOR = COLORS.primary; // لون خلفية الكارت الوهمي

const SkeletonFreeGames = () => {
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
      {/* 1. Image Container (Top) */}
      {/* يطابق height: 200 */}
      <View style={styles.imageContainer}>
        <SkeletonItem style={styles.coverSkeleton} />

        {/* Store Icon Badge Placeholder (Bottom Left of Image) */}
        <SkeletonItem
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 2,
            borderColor: CARD_BG_COLOR, // لمحاكاة البوردر
          }}
        />
      </View>

      {/* 2. Info Section (Bottom) */}
      {/* يطابق padding: 12 */}
      <View style={styles.infoSection}>
        {/* Title Lines (Centered) */}
        <View style={{ alignItems: "center", gap: 6 }}>
          <SkeletonItem style={{ width: "90%", height: 14, borderRadius: 4 }} />
          <SkeletonItem style={{ width: "60%", height: 14, borderRadius: 4 }} />
        </View>

        {/* Claim Button Placeholder */}
        {/* يطابق savingsButton */}
        <SkeletonItem
          style={{
            width: "100%",
            height: 36,
            borderRadius: 10,
            marginTop: 8, // يطابق margin زر التوفير
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 16,
    backgroundColor: CARD_BG_COLOR,
    overflow: "hidden",
    // إضافة Shadow خفيف
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
    flex: 1, // المساحة المتبقية (100px)
    padding: 12,
    justifyContent: "space-between", // يوزع المساحة بين العنوان والزر
  },
  skeletonItem: {
    backgroundColor: SKELETON_BASE_COLOR,
    overflow: "hidden",
  },
});

export default SkeletonFreeGames;
