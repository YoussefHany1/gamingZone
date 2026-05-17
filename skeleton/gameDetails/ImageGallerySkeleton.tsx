import React from "react";
import { View, Dimensions } from "react-native";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

const { width } = Dimensions.get("window");

// Full-width cover + thumbnail strip skeleton
const ImageGallerySkeleton: React.FC = () => {
  const shimmer = useShimmer();
  const S = (p: Parameters<typeof SkeletonBar>[0]) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View>
      {/* Main image */}
      <S w={width} h={350} r={0} />
      {/* Thumbnail dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8, gap: 6 }}>
        {[1, 2, 3, 4].map((i) => (
          <S key={i} w={8} h={8} r={4} />
        ))}
      </View>
    </View>
  );
};

export default ImageGallerySkeleton;
