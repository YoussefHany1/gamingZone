import { create } from "zustand";

interface TabBarState {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  isVisible: true,
  setIsVisible: (visible) =>
    set((state) => {
      if (state.isVisible === visible) return state;
      return { isVisible: visible };
    }),
  activeIndex: 0,
  setActiveIndex: (index) =>
    set((state) => {
      if (state.activeIndex === index) return state;
      return { activeIndex: index };
    }),
}));
