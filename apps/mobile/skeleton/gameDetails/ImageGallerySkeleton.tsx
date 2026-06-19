import React from "react";
import { View, Dimensions } from "react-native";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

const { width } = Dimensions.get("window");

// Full-width cover + thumbnail strip skeleton
const ImageGallerySkeleton: React.FC = () => {
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View>
      {/* Main image */}
      <S width={width} height={350} radius={0} />
      {/* Thumbnail dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8, gap: 6 }}>
        {[1, 2, 3, 4].map((i) => (
          <S key={i} width={8} height={8} radius={4} />
        ))}
      </View>
    </View>
  );
};

export default ImageGallerySkeleton;
