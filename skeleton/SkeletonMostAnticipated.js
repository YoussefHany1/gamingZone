import { useEffect } from "react";
import { View, StyleSheet, Dimensions, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 200;

const SkeletonAnticipatedCard = () => {
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
      {/* Background shimmer */}
      <View style={styles.backgroundPlaceholder}>
        <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.3)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* Overlay */}
      <View style={styles.overlay} />

      {/* Countdown placeholders */}
      <View style={styles.content}>
        <View style={styles.countdownGroup}>
          <View style={styles.countdownLabelPlaceholder} />
          <View style={styles.countdownValuePlaceholder} />
        </View>
        <View style={styles.countdownGroup}>
          <View style={styles.countdownLabelPlaceholder} />
          <View style={styles.countdownValuePlaceholder} />
        </View>
        <View style={styles.countdownGroup}>
          <View style={styles.countdownLabelPlaceholder} />
          <View style={styles.countdownValuePlaceholder} />
        </View>
      </View>

      {/* Title placeholder */}
      <View style={styles.textWrapper}>
        <View style={styles.titlePlaceholder} />
        <View style={[styles.titlePlaceholder, { width: "60%" }]} />
      </View>
    </View>
  );
};

const SkeletonMostAnticipated = () => {
  // عرض 3 cards كـ placeholder
  const skeletonData = Array.from({ length: 3 }, (_, index) => ({
    id: `skeleton-${index}`,
  }));

  return (
    <View style={styles.container}>
      {/* Header placeholder */}
      <View style={styles.headerPlaceholder} />

      <FlatList
        data={skeletonData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={() => <SkeletonAnticipatedCard />}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerPlaceholder: {
    width: 200,
    height: 24,
    backgroundColor: COLORS.secondary,
    marginLeft: 20,
    marginBottom: 15,
    borderRadius: 4,
  },
  listContent: {
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.secondary,
    elevation: 5,
  },
  backgroundPlaceholder: {
    width: "100%",
    height: "100%",
    position: "absolute",
    backgroundColor: COLORS.secondary,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    flexDirection: "row",
    gap: 15,
  },
  countdownGroup: {
    flexDirection: "column",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
  },
  countdownLabelPlaceholder: {
    width: 50,
    height: 14,
    backgroundColor: COLORS.secondary + "80",
    borderRadius: 4,
  },
  countdownValuePlaceholder: {
    width: 60,
    height: 40,
    backgroundColor: COLORS.primary + "30",
    borderRadius: 50,
  },
  textWrapper: {
    marginBottom: 10,
    marginHorizontal: 10,
    gap: 6,
  },
  titlePlaceholder: {
    width: "100%",
    height: 20,
    backgroundColor: COLORS.secondary + "80",
    borderRadius: 4,
  },
});

export default SkeletonMostAnticipated;
