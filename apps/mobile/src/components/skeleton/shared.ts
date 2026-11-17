import { useEffect } from "react";
import { Dimensions } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Hooks
//
// Skeleton colors live on the theme palette (`colors.skeletonBase` /
// `colors.skeletonHighlight`) so placeholders follow the active theme. Reach
// them through `useThemeColors()`; they are not exported from here because
// module-level constants cannot react to a theme change.
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
    // The shared value is stable; this only re-runs when a caller passes new
    // bounds, which is exactly when the loop should be rebuilt.
  }, [opacity, min, max]);

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
  }, [translateX]);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
};

/**
 * Shimmer value that oscillates between 0 and 1 (900ms up, 900ms down).
 *
 * Consolidated single source of truth for the "0..1 shimmer" used by the
 * game-details skeleton layer. Previously duplicated in
 * `features/games/skeleton/gameDetails/useShimmer.ts`; that module now
 * re-exports this hook so every consumer keeps the exact same timing and
 * API without a second implementation.
 *
 * @returns a Reanimated `SharedValue<number>` — drive opacity/translateX
 *          through `useAnimatedStyle` at the call site.
 */
export const useShimmer = (): SharedValue<number> => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1, // repeat forever
      false,
    );
    return () => {
      shimmer.value = 0;
    };
  }, [shimmer]);

  return shimmer;
};
