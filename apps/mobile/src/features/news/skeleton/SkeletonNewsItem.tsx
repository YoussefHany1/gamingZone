import React from "react";
import { View, StyleSheet } from "react-native";
import COLORS from "@/src/constants/colors";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";
import type { SkeletonNewsItemProps } from "../types";


const SkeletonNewsItem: React.FC<SkeletonNewsItemProps> = ({ language }) => {
  const animatedStyle = useShimmerSweep();
  const isRTL = language === "ar";

  return (
    <View style={[styles.container, { direction: isRTL ? "rtl" : "ltr" }]}>
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

      {/* Thumbnail */}
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
    borderBottomColor: "#4a5565",
    borderRadius: 16,
  },
  textContainer: {
    width: "65%",
  },
  thumbnail: {
    width: 135,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.secondary + "40",
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
    marginBottom: 12,
  },
  descLine: {
    width: "60%",
    height: 15,
  },
});
