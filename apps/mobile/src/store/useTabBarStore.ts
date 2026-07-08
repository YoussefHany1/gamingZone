import { create } from "zustand";

interface TabBarState {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  isVisible: true,
  setIsVisible: (visible) => set((state) => {
    // Only update if changed to avoid unnecessary re-renders
    if (state.isVisible === visible) return state;
    return { isVisible: visible };
  }),
}));
