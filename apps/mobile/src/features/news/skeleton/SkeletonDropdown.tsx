import React from "react";
import { View, StyleSheet } from "react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";

const DropdownSkeleton: React.FC = () => {
  const styles = useThemeStyles((c) => ({
    wrapper: {
      alignItems: "center",
      paddingBottom: 20,
      marginTop: 20,
    },
    headerSkeleton: {
      width: 250,
      height: 50,
      borderRadius: 16,
      backgroundColor: c.accentSurface,
      marginBottom: 30,
      overflow: "hidden",
    },
    pickerContainer: {
      borderWidth: 1,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: c.accentBorder,
      width: "90%",
      height: 50,
      justifyContent: "center",
      paddingHorizontal: 15,
      borderColor: "transparent",
    },
    pickerTextLine: {
      width: "40%",
      height: 15,
      backgroundColor: c.accentBorder,
      borderRadius: 4,
      overflow: "hidden",
    },
  }));

  const animatedStyle = useShimmerSweep();

  return (
    <View style={styles.wrapper}>
      {/* Header title skeleton */}
      <View style={styles.headerSkeleton}>
        <Shimmer animatedStyle={animatedStyle} />
      </View>

      {/* Dropdown box skeleton */}
      <View style={styles.pickerContainer}>
        <View style={styles.pickerTextLine}>
          <Shimmer animatedStyle={animatedStyle} />
        </View>
      </View>
    </View>
  );
};

export default React.memo(DropdownSkeleton);
