import type { ThemeColors } from "@/src/constants/colors";
import { useThemeStore } from "@/src/store/useThemeStore";

/** Whether the app is currently rendering in dark mode. */
export function useIsDark(): boolean {
  return useThemeStore((state) => state.isDark);
}

/**
 * The active palette, composed from the brightness, style and accent axes.
 *
 * Reads the palette the store derived rather than selecting a base palette
 * here, so style and accent changes are picked up automatically. The store
 * caches composed palettes, so the reference is stable between renders and
 * safe to use as a memo dependency.
 */
export function useThemeColors(): ThemeColors {
  return useThemeStore((state) => state.colors);
}
