import { useEffect } from "react";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  SharedValue,
} from "react-native-reanimated";

/**
 * Returns a Reanimated SharedValue that oscillates between 0 and 1.
 *
 * Migrated from `Animated` (JS thread, no native driver) to Reanimated
 * (UI thread) — the animation now runs 100% off the JS thread, which
 * eliminates JS-bridge round-trips during skeleton loading screens.
 */
const useShimmer = (): SharedValue<number> => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 }),
      ),
      -1, // repeat forever
      false,
    );
    return () => {
      shimmer.value = 0;
    };
  }, [shimmer]);

  return shimmer;
};

export default useShimmer;
