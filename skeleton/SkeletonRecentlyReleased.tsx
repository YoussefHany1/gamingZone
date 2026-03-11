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

// Skeleton color palette
const SKELETON_BASE_COLOR = "#1f3a60";
const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";
const CARD_BG_COLORS: [string, string] = ["#1a3052", "#121212"];

const { width } = Dimensions.get("window");

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

const SkeletonRecentlyReleased: React.FC = () => {
  // Opacity pulse animation
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite repetition
      true, // reverse direction on each cycle
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.gameCard}>
      {/* Card gradient background */}
      <LinearGradient colors={CARD_BG_COLORS} style={styles.cardGradient} />

      <View style={styles.cardContent}>
        {/* Cover placeholder */}
        <View style={styles.coverContainer}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.coverSkeleton} />
        </View>

        {/* Info placeholder */}
        <View style={styles.infoContainer}>
          {/* Title lines */}
          <View style={{ marginBottom: 8 }}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: "90%", height: 20, borderRadius: 4, marginBottom: 6 }}
            />
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: "60%", height: 20, borderRadius: 4 }}
            />
          </View>

          {/* Date placeholder */}
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={{ width: "40%", height: 14, borderRadius: 3, marginTop: 4 }}
          />

          {/* bottom info placeholder */}
          <View style={{ marginTop: "auto" }}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: "80%", height: 12, borderRadius: 3, marginBottom: 6 }}
            />
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{ width: "50%", height: 12, borderRadius: 3 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};
export default React.memo(SkeletonRecentlyReleased);

const styles = StyleSheet.create({
  // Mirrors the real gameCard properties exactly
  gameCard: {
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    height: 174, // 150 cover + 12 padding top + 12 padding bottom
    backgroundColor: "#1a3052", // fallback color
  },
  cardGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  // Mirrors the real cardContent properties
  cardContent: {
    flexDirection: "row",
    padding: 12,
    height: "100%",
  },
  // Mirrors the real coverContainer properties
  coverContainer: {
    width: 110,
    height: 150,
  },
  coverSkeleton: {
    width: "100%",
    height: "100%",
    borderRadius: 12, // matches the real cover image border
  },
  // Mirrors the real infoContainer properties
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "flex-start",
    paddingVertical: 12, // critical for vertical alignment
  },
  skeletonItem: {
    overflow: "hidden",
    backgroundColor: SKELETON_BASE_COLOR,
  },
});
