import React from "react";
import { View, StyleSheet } from "react-native";
import COLORS from "@/src/constants/colors";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";

const DropdownSkeleton: React.FC = () => {
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
