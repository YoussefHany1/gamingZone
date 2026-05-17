import { Animated, StyleProp, ViewStyle } from "react-native";

interface Props {
  shimmer: Animated.Value;
  w?: number | string;
  h?: number;
  r?: number;
  style?: StyleProp<ViewStyle>;
}

const SkeletonBar: React.FC<Props> = ({ shimmer, w = "100%", h = 16, r = 8, style }) => {
  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(81,105,150,0.18)", "rgba(119,155,221,0.38)"],
  });
  return (
    <Animated.View
      style={[{ width: w as any, height: h, borderRadius: r, backgroundColor: bg }, style]}
    />
  );
};

export default SkeletonBar;
