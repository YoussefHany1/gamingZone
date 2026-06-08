import { useRef, useCallback } from "react";
import { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useTabBarStore } from "../store/useTabBarStore";

export const useScrollDirection = () => {
  const setIsVisible = useTabBarStore((state) => state.setIsVisible);
  const lastOffsetY = useRef(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentOffsetY = event.nativeEvent.contentOffset.y;

      // Always show tab bar when near the top (e.g. bounce area or first 20px)
      if (currentOffsetY <= 20) {
        setIsVisible(true);
        lastOffsetY.current = currentOffsetY;
        return;
      }

      const diff = currentOffsetY - lastOffsetY.current;

      // Scrolling down -> hide tab bar
      if (diff > 5 && currentOffsetY > 50) {
        setIsVisible(false);
      }
      // Scrolling up -> show tab bar
      else if (diff < -5) {
        setIsVisible(true);
      }

      lastOffsetY.current = currentOffsetY;
    },
    [setIsVisible]
  );

  return { onScroll };
};
