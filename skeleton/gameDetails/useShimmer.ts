import { useEffect, useRef } from "react";
import { Animated } from "react-native";

const useShimmer = (): Animated.Value => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  return shimmer;
};

export default useShimmer;
