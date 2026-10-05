import { THEME_COLORS, type ThemeColors } from "@/src/constants/colors";
import { useThemeStore } from "@/src/store/useThemeStore";

/** Whether the app is currently rendering in dark mode. */
export function useIsDark(): boolean {
  return useThemeStore((state) => state.isDark);
}

/**
 * The active palette. Returns one of two frozen module-level objects, so the
 * reference is stable between renders and safe to use as a memo dependency.
 */
export function useThemeColors(): ThemeColors {
  const isDark = useIsDark();
  return isDark ? THEME_COLORS.dark : THEME_COLORS.light;
}
