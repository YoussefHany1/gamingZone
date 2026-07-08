import React from "react";
import { View } from "react-native";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

// Mirrors: title, releaseDate, platforms row + rating circle, age badge
const GameDetailsMetaSkeleton: React.FC = () => {
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View>
      {/* Game title */}
      <S width="70%" height={28} radius={6} style={{ direction: "ltr" }} />
      {/* Release date */}
      <S width="38%" height={14} radius={5} style={{ marginTop: 8, direction: "ltr" }} />

      {/* Platforms + rating row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, direction: "ltr" }}>
        <View style={{ flexDirection: "row", flex: 1, gap: 8 }}>
          {[70, 70, 70].map((w, i) => (
            <S key={i} width={w} height={28} radius={14} />
          ))}
        </View>
        {/* Rating circle */}
        <S width={70} height={70} radius={35} />
      </View>

      {/* Age badge */}
      <S width={48} height={30} radius={8} style={{ alignSelf: "flex-end", marginTop: 8 }} />
    </View>
  );
};

export default GameDetailsMetaSkeleton;
