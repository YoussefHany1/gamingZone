import { useEffect } from "react";
import { Dimensions } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export const SKELETON_BASE_COLOR = "#1f3a60";
export const SKELETON_HIGHLIGHT_COLOR = "#2a4a75";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Pulse opacity animation (min → max → min, infinite loop).
 * Built on react-native-reanimated — the UI-thread native driver is always
 * active; no `useNativeDriver` flag is needed or available.
 *
 * @param min  Lowest opacity value (default 0.5)
 * @param max  Highest opacity value (default 1.0)
 */
export const usePulseAnimation = (
  min = 0.5,
  max = 1,
): ReturnType<typeof useAnimatedStyle> => {
  const opacity = useSharedValue(min);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(max, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(min, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
};

/**
 * Horizontal shimmer sweep (left → right, infinite loop).
 * Built on react-native-reanimated — the UI-thread native driver is always
 * active; no `useNativeDriver` flag is needed or available.
 */
export const useShimmerSweep = (): ReturnType<typeof useAnimatedStyle> => {
  const translateX = useSharedValue(-SCREEN_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration: 1500 }),
      -1,
      false,
    );
  }, []);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
};
