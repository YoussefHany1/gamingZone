import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");

// Types
interface SkeletonNewsItemProps {
  /** ISO language code — used to determine text direction (e.g. "ar" for RTL) */
  language?: string;
}

interface ShimmerProps {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

// Shimmer
const Shimmer = React.memo<ShimmerProps>(({ animatedStyle }) => (
  <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
    <LinearGradient
      colors={["transparent", "rgba(255,255,255,0.1)", "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  </Animated.View>
));

// Main
const SkeletonNewsItem: React.FC<SkeletonNewsItemProps> = ({ language }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const isRTL = language === "ar";

  return (
    <View
      style={[
        styles.container,
        { direction: isRTL ? "rtl" : "ltr" }, // adjust text direction per language
      ]}
    >
      {/* Text container */}
      <View
        style={[
          styles.textContainer,
          isRTL ? { paddingLeft: 8 } : { paddingRight: 8 },
        ]}
      >
        <View style={[styles.skeletonLine, styles.titleLine]}>
          <Shimmer animatedStyle={animatedStyle} />
        </View>
        <View style={[styles.skeletonLine, styles.descLine]}>
          <Shimmer animatedStyle={animatedStyle} />
        </View>
      </View>

      {/* Thumbnail placeholder */}
      <View style={styles.thumbnail}>
        <Shimmer animatedStyle={animatedStyle} />
      </View>
    </View>
  );
};
export default React.memo(SkeletonNewsItem);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#4a5565", // matches LatestNews border color
    borderRadius: 16,
  },
  textContainer: {
    width: "65%",
  },
  thumbnail: {
    width: 135,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.secondary + "40", // semi-transparent to distinguish skeleton
    overflow: "hidden",
  },
  skeletonLine: {
    backgroundColor: COLORS.secondary + "40",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  titleLine: {
    width: "90%",
    height: 19,
    marginBottom: 12, // matches spacing in LatestNews
  },
  descLine: {
    width: "60%",
    height: 15,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
