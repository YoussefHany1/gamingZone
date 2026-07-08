import React, { memo } from "react";
import { View } from "react-native";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import SkeletonItem from "@/src/components/SkeletonItem";

const SkeletonUserLists = memo(() => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={{ paddingTop: 15 }}>
      {[...Array(4)].map((_, index) => (
        <SkeletonItem
          key={index}
          animatedStyle={animatedStyle}
          style={{
            height: 64,
            borderRadius: 12,
            marginHorizontal: 16,
            marginBottom: 10,
          }}
        />
      ))}
    </View>
  );
});

SkeletonUserLists.displayName = "SkeletonUserLists";
export default SkeletonUserLists;
