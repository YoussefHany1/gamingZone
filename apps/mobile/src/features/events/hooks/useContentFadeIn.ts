import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";

/**
 * Returns an opacity `Animated.Value` that fades 0 → 1 once pending JS
 * interactions settle. Deferring the animation keeps the first paint and the
 * navigation transition smooth.
 */
export function useContentFadeIn(duration = 280): Animated.Value {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const task = runAfterInteractions(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    });
    return () => task.cancel();
  }, [opacity, duration]);

  return opacity;
}
