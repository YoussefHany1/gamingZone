import React, { memo } from "react";
import { View } from "react-native";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import SkeletonItem from "@/src/components/SkeletonItem";

const SkeletonEventDetails = memo(() => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 18, gap: 24 }}>
        {/* Dates row */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={{ flex: 1, height: 60, borderRadius: 12 }}
          />
          <SkeletonItem
            animatedStyle={animatedStyle}
            style={{ flex: 1, height: 60, borderRadius: 12 }}
          />
        </View>
        {/* Starts in */}
        <SkeletonItem
          animatedStyle={animatedStyle}
          style={{ width: 100, height: 20, borderRadius: 4 }}
        />
        <SkeletonItem
          animatedStyle={animatedStyle}
          style={{ width: "100%", height: 80, borderRadius: 12 }}
        />
        {/* Button */}
        <SkeletonItem
          animatedStyle={animatedStyle}
          style={{ width: "100%", height: 50, borderRadius: 14 }}
        />
      </View>
    </View>
  );
});

SkeletonEventDetails.displayName = "SkeletonEventDetails";
export default SkeletonEventDetails;
