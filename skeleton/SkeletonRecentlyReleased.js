import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// تعريف ألوان مؤقتة (استبدلها بـ COLORS.darkBackground لديك إذا أردت)
const SKELETON_BASE_COLOR = "#1f3a60";
const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";
const CARD_BG_COLORS = ["#1a3052", "#121212"]; // نفس ألوان خلفية الكارت الأصلي

const { width } = Dimensions.get("window");

const SkeletonRecentlyReleased = () => {
  // 1. إعداد الأنيميشن (Opacity Pulse)
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // تكرار لا نهائي
      true, // Reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // مكون فرعي لرسم المستطيلات الرمادية (السطور)
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
    <View style={styles.gameCard}>
      {/* خلفية الكارت (نفس التدرج الأصلي) */}
      <LinearGradient colors={CARD_BG_COLORS} style={styles.cardGradient} />

      <View style={styles.cardContent}>
        {/* 1. Cover Placeholder */}
        {/* يطابق coverContainer: width: 110, height: 150 */}
        <View style={styles.coverContainer}>
          <SkeletonItem style={styles.coverSkeleton} />
        </View>

        {/* 2. Info Placeholder */}
        {/* يطابق infoContainer: marginLeft: 12, paddingVertical: 12 */}
        <View style={styles.infoContainer}>
          {/* Title Placeholder */}
          {/* يطابق fontSize 17 + marginBottom 8 */}
          <View style={{ marginBottom: 8 }}>
            <SkeletonItem
              style={{
                width: "90%",
                height: 20,
                borderRadius: 4,
                marginBottom: 6,
              }}
            />
            <SkeletonItem
              style={{ width: "60%", height: 20, borderRadius: 4 }}
            />
          </View>

          {/* Date Placeholder */}
          {/* يطابق مكان التاريخ */}
          <SkeletonItem
            style={{ width: "40%", height: 14, borderRadius: 3, marginTop: 4 }}
          />

          {/* Genres / Bottom Info Placeholder */}
          {/* يطابق مكان التصنيفات والمنصات في الأسفل */}
          <View style={{ marginTop: "auto" }}>
            <SkeletonItem
              style={{
                width: "80%",
                height: 12,
                borderRadius: 3,
                marginBottom: 6,
              }}
            />
            <SkeletonItem
              style={{ width: "50%", height: 12, borderRadius: 3 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // نفس خصائص gameCard الأصلية بالضبط
  gameCard: {
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    height: 174, // (150 cover + 12 padding top + 12 padding bottom)
    backgroundColor: "#1a3052", // Fallback color
  },
  cardGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  // نفس خصائص cardContent الأصلية
  cardContent: {
    flexDirection: "row",
    padding: 12,
    height: "100%",
  },
  // نفس خصائص coverContainer الأصلية
  coverContainer: {
    width: 110,
    height: 150,
  },
  coverSkeleton: {
    width: "100%",
    height: "100%",
    borderRadius: 12, // نفس بوردر الصورة الأصلية
  },
  // نفس خصائص infoContainer الأصلية
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "flex-start", // غيرنا هذا قليلاً للتحكم في مكان العناصر الوهمية
    paddingVertical: 12, // مهم جداً للمحاذاة الرأسية
  },
  skeletonItem: {
    overflow: "hidden",
    backgroundColor: SKELETON_BASE_COLOR,
  },
});

export default SkeletonRecentlyReleased;
