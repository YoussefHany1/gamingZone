import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";

const CARD_BG_COLORS: [string, string] = ["#1a3052", "#121212"];

const SkeletonRecentlyReleased: React.FC = () => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={styles.gameCard}>
      {/* Card gradient background */}
      <LinearGradient colors={CARD_BG_COLORS} style={styles.cardGradient} />

      <View style={styles.cardContent}>
        {/* Cover placeholder */}
        <View style={styles.coverContainer}>
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={styles.coverSkeleton}
          />
        </View>

        {/* Info placeholder */}
        <View style={styles.infoContainer}>
          {/* Title lines */}
          <View style={{ marginBottom: 8 }}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{
                width: "90%",
                height: 20,
                borderRadius: 4,
                marginBottom: 6,
              }}
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

          {/* Bottom info placeholder */}
          <View style={{ marginTop: "auto" }}>
            <SkeletonItem
              animatedStyle={animatedStyle}
              style={{
                width: "80%",
                height: 12,
                borderRadius: 3,
                marginBottom: 6,
              }}
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
  gameCard: {
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    height: 174,
    backgroundColor: "#1a3052",
  },
  cardGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
    height: "100%",
  },
  coverContainer: {
    width: 110,
    height: 150,
  },
  coverSkeleton: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "flex-start",
    paddingVertical: 12,
  },
});
