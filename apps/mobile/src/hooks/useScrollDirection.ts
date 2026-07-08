import { useRef, useCallback } from "react";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useTabBarStore } from "../store/useTabBarStore";

// Hides the tab bar while the user scrolls down and shows it again when they
// scroll up, with dead-zone thresholds to prevent jitter on micro-movements.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Always show the tab bar within this many px from the top (accounts for bounce). */
const TOP_THRESHOLD_PX = 20;

/** Minimum downward delta (px) before hiding the tab bar. */
const HIDE_DELTA_PX = 5;

/** Minimum scroll position (px) before the hide logic kicks in. */
const HIDE_MIN_OFFSET_PX = 50;

/** Minimum upward delta (px) before showing the tab bar again. */
const SHOW_DELTA_PX = -5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseScrollDirectionResult {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useScrollDirection = (): UseScrollDirectionResult => {
  const setIsVisible = useTabBarStore((state) => state.setIsVisible);
  const lastOffsetY = useRef(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;

      // Near the top — always show the tab bar.
      if (currentY <= TOP_THRESHOLD_PX) {
        setIsVisible(true);
        lastOffsetY.current = currentY;
        return;
      }

      const delta = currentY - lastOffsetY.current;

      if (delta > HIDE_DELTA_PX && currentY > HIDE_MIN_OFFSET_PX) {
        setIsVisible(false);
      } else if (delta < SHOW_DELTA_PX) {
        setIsVisible(true);
      }

      lastOffsetY.current = currentY;
    },
    [setIsVisible],
  );

  return { onScroll };
};
