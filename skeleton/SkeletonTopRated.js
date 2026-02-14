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
import COLORS from "../constants/colors"; // تأكد من المسار الصحيح

const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_MARGIN = 5;

// ألوان الـ Skeleton
const SKELETON_BASE_COLOR = "#1f3a60";
const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";
const CARD_BG_COLOR = COLORS.primary; // لون خلفية الكارت الوهمي

const SkeletonGameCard = () => {
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
      {/* 1. Cover Image Skeleton */}
      {/* يطابق height: 160 */}
      <View style={styles.coverContainer}>
        <SkeletonItem style={styles.coverSkeleton} />
      </View>

      {/* 2. Info Container Skeleton */}
      {/* يطابق padding: 12 */}
      <View style={styles.infoContainer}>
        {/* Title Area */}
        <View>
          {/* Title Line 1 */}
          <SkeletonItem
            style={{
              width: "90%",
              height: 18,
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          {/* Title Line 2 + Year Badge simulation */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            <SkeletonItem
              style={{ width: "40%", height: 18, borderRadius: 4 }}
            />
            <SkeletonItem style={{ width: 40, height: 18, borderRadius: 8 }} />
          </View>
        </View>

        {/* Rating Area (Bottom) */}
        {/* يطابق ratingMainContainer */}
        <View style={styles.ratingContainer}>
          {/* Rating Circle Skeleton (55x55) */}
          <SkeletonItem style={styles.ratingCircle} />

          {/* Genres List Skeleton */}
          <View style={styles.genresContainer}>
            <SkeletonItem
              style={{
                width: 70,
                height: 20,
                borderRadius: 12,
                marginBottom: 4,
              }}
            />
            <SkeletonItem style={{ width: 50, height: 20, borderRadius: 12 }} />
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
    backgroundColor: CARD_BG_COLOR,
    overflow: "hidden",
    // إضافة Shadow خفيف ليشبه الكارت الحقيقي
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
    flex: 1, // يأخذ المساحة المتبقية (320 - 160 = 160)
    padding: 12,
    justifyContent: "space-between", // يوزع المحتوى بين العنوان (فوق) والتقييم (تحت)
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12, // يطابق marginBottom في الكود الأصلي
  },
  ratingCircle: {
    width: 55,
    height: 55,
    borderRadius: 33, // نصف القطر لجعلها دائرية
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

export default SkeletonGameCard;
