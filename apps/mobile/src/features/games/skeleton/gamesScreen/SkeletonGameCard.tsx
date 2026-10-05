import React from "react";
import { View } from "react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";

const SkeletonGameCard: React.FC = () => {
  const styles = useThemeStyles((c) => ({
    cardContainer: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.accentText,
      padding: 10,
      borderRadius: 16,
      margin: 10,
      backgroundColor: c.accentSurface,
      height: 270,
      width: 160,
    },
    coverPlaceholder: {
      width: 140,
      height: 190,
      borderRadius: 10,
      backgroundColor: c.accent,
      overflow: "hidden",
      marginBottom: 16,
    },
    titlePlaceholder: {
      width: 100,
      height: 16,
      backgroundColor: c.accent,
      borderRadius: 4,
    },
  }));

  const animatedStyle = useShimmerSweep();

  return (
    <View style={styles.cardContainer}>
      {/* Game cover image placeholder */}
      <View style={styles.coverPlaceholder}>
        <Shimmer animatedStyle={animatedStyle} />
      </View>

      {/* Game title placeholder */}
      <View style={styles.titlePlaceholder} />
    </View>
  );
};

export default React.memo(SkeletonGameCard);
