import React from "react";
import { View } from "react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import Shimmer from "@/src/components/skeleton/Shimmer";
import { useShimmerSweep } from "@/src/components/skeleton/shared";
import type { SkeletonNewsItemProps } from "../types";

const SkeletonNewsItem: React.FC<SkeletonNewsItemProps> = ({ language }) => {
  const animatedStyle = useShimmerSweep();
  const isRTL = language === "ar";

  const styles = useThemeStyles((c) => ({
    container: {
      alignItems: "center",
      alignSelf: "center",
      flexDirection: "row",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      borderRadius: 16,
    },
    textContainer: {
      width: "65%",
    },
    thumbnail: {
      width: 135,
      height: 100,
      borderRadius: 16,
      backgroundColor: c.skeletonBase,
      overflow: "hidden",
    },
    skeletonLine: {
      backgroundColor: c.skeletonBase,
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
  }));

  return (
    <View style={[styles.container, { direction: isRTL ? "rtl" : "ltr" }]}>
      {/* Text container */}
      <View
        style={[styles.textContainer, isRTL ? { paddingLeft: 8 } : { paddingRight: 8 }]}
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
