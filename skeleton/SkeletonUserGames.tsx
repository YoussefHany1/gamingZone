import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");

// Types

interface ShimmerPlaceholderProps {
  style?: ViewStyle;
}

// ShimmerPlaceholder

const ShimmerPlaceholder = React.memo<ShimmerPlaceholderProps>(({ style }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1250, easing: Easing.linear }),
      -1, // infinite repetition
      false // always sweep left-to-right
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={[styles.placeholderBase, style, { overflow: "hidden" }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.5)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
});

// SkeletonItem

const SkeletonItem = React.memo(() => {
  return (
    <View style={styles.skeletonContainer}>
      {/* Game cover image placeholder */}
      <ShimmerPlaceholder style={styles.skeletonImage} />

      {/* Text info placeholders */}
      <View style={styles.skeletonInfo}>
        {/* Title placeholder */}
        <ShimmerPlaceholder style={styles.skeletonTitle} />
        {/* Date placeholder */}
        <ShimmerPlaceholder style={styles.skeletonDate} />
      </View>

      {/* Delete icon placeholder */}
      <ShimmerPlaceholder style={styles.skeletonIcon} />
    </View>
  );
});

// Main

// Number of dummy rows displayed during loading
const DUMMY_COUNT = 4;
const DUMMY_DATA = Array(DUMMY_COUNT).fill(0);

const UserGamesSkeleton: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <FlashList
        data={DUMMY_DATA}
        keyExtractor={(_, index) => index.toString()}
        renderItem={() => <SkeletonItem />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={150}
      />
    </SafeAreaView>
  );
};
export default React.memo(UserGamesSkeleton);

const styles = StyleSheet.create({
  placeholderBase: {
    backgroundColor: COLORS.secondary ? COLORS.secondary + "40" : "#ccc",
  },
  skeletonContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(119, 155, 221, 0.1)",
    borderRadius: 12,
    marginTop: 24,
    padding: 10,
    alignItems: "center",
  },
  skeletonImage: {
    width: 80,
    height: 105,
    borderRadius: 8,
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  skeletonTitle: {
    width: "70%",
    height: 20,
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonDate: {
    width: "40%",
    height: 14,
    borderRadius: 4,
  },
  skeletonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 8,
  },
});
