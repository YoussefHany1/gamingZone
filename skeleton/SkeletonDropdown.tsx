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
interface ShimmerProps {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

// Shimmer
const Shimmer = React.memo<ShimmerProps>(({ animatedStyle }) => (
  <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
    <LinearGradient
      colors={["transparent", "rgba(255,255,255,0.2)", "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  </Animated.View>
));

// Main
const DropdownSkeleton: React.FC = () => {
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

  return (
    <View style={styles.wrapper}>
      {/* Header Title Skeleton */}
      <View style={styles.headerSkeleton}>
        <Shimmer animatedStyle={animatedStyle} />
      </View>

      {/* Dropdown Box Skeleton */}
      <View style={styles.pickerContainer}>
        <View style={styles.pickerTextLine}>
          <Shimmer animatedStyle={animatedStyle} />
        </View>
      </View>
    </View>
  );
};
export default React.memo(DropdownSkeleton);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingBottom: 20,
    marginTop: 20,
  },
  headerSkeleton: {
    width: 250,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.secondary + "80",
    marginBottom: 30,
    overflow: "hidden",
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.secondary + "50",
    width: "90%",
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderColor: "transparent",
  },
  pickerTextLine: {
    width: "40%",
    height: 15,
    backgroundColor: COLORS.secondary + "40",
    borderRadius: 4,
    overflow: "hidden",
  },
});


