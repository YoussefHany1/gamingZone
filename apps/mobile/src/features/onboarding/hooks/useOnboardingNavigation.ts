import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { SLIDE_WIDTH } from "../lib/layout";
import type { OnboardingSlide } from "../types";

export type UseOnboardingNavigationResult = {
  activeIndex: number;
  /** True on the final slide, where "next" finishes onboarding instead. */
  isLast: boolean;
  /** Handed to the slides list so the footer can page it. */
  listRef: RefObject<FlatList<OnboardingSlide> | null>;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  goNext: () => void;
};

/**
 * Which slide is showing, plus the two ways it changes: a swipe (reported by
 * the list) and the footer button, which advances programmatically and falls
 * through to `onDone` on the last slide.
 */
export function useOnboardingNavigation(
  total: number,
  onDone: () => void,
): UseOnboardingNavigationResult {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<OnboardingSlide> | null>(null);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / SLIDE_WIDTH);
      if (newIndex >= 0 && newIndex < total) {
        // استخدام prev للتأكد التام من عدم تحديث الـ State إلا إذا تغير الرقم فعلاً
        setActiveIndex((prev) => (prev === newIndex ? prev : newIndex));
      }
    },
    [total],
  );

  const goNext = useCallback((): void => {
    if (activeIndex < total - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      listRef.current?.scrollToOffset({
        offset: nextIndex * SLIDE_WIDTH,
        animated: true,
      });
    } else {
      onDone();
    }
  }, [activeIndex, total, onDone]);

  return { activeIndex, isLast: activeIndex === total - 1, listRef, onMomentumScrollEnd, goNext };
}
