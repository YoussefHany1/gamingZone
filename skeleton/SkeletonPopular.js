import { useEffect } from "react";
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
const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;

const SkeletonPopular = () => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.cardContainer}>
      {/* غلاف اللعبة */}
      <View style={styles.coverContainer}>
        <View style={styles.coverPlaceholder}>
          <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.3)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>

      {/* عنوان اللعبة */}
      <View style={styles.titlePlaceholder} />

      {/* إحصائيات اللعبة */}
      <View style={styles.statsContainer}>
        <View style={styles.statPlaceholder} />
        <View style={styles.statPlaceholder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.primary,
    marginHorizontal: 5,
  },
  coverContainer: {
    width: "100%",
    height: 180,
    overflow: "hidden",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondary,
    overflow: "hidden",
  },
  shimmerOverlay: {
    width: width * 1.5,
    height: "100%",
  },
  titlePlaceholder: {
    height: 24,
    backgroundColor: COLORS.secondary + "80",
    margin: 8,
    borderRadius: 4,
    marginBottom: 8,
    width: "85%",
  },
  statsContainer: {
    paddingHorizontal: 8,
    gap: 6,
  },
  statPlaceholder: {
    height: 16,
    backgroundColor: COLORS.secondary + "50",
    borderRadius: 4,
    width: "75%",
  },
});

export default SkeletonPopular;
