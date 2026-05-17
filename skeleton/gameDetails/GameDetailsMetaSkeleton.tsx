import React from "react";
import { View } from "react-native";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

// Mirrors: title, releaseDate, platforms row + rating circle, age badge
const GameDetailsMetaSkeleton: React.FC = () => {
  const shimmer = useShimmer();
  const S = (p: Parameters<typeof SkeletonBar>[0]) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View>
      {/* Game title */}
      <S w="70%" h={28} r={6} style={{ direction: "ltr" }} />
      {/* Release date */}
      <S w="38%" h={14} r={5} style={{ marginTop: 8, direction: "ltr" }} />

      {/* Platforms + rating row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, direction: "ltr" }}>
        <View style={{ flexDirection: "row", flex: 1, gap: 8 }}>
          {[70, 70, 70].map((w, i) => (
            <S key={i} w={w} h={28} r={14} />
          ))}
        </View>
        {/* Rating circle */}
        <S w={70} h={70} r={35} />
      </View>

      {/* Age badge */}
      <S w={48} h={30} r={8} style={{ alignSelf: "flex-end", marginTop: 8 }} />
    </View>
  );
};

export default GameDetailsMetaSkeleton;
