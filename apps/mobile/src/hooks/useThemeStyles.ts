import { useMemo } from "react";
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import type { ThemeColors } from "@/src/constants/colors";

// `StyleSheet.NamedStyles` was removed from the React Native 0.86 typings,
// and the style types are not re-exported on the `StyleSheet` namespace, so
// they are imported as top-level types here.
type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Builds a `StyleSheet` from an explicit palette and rebuilds only when that
 * palette's identity changes.
 *
 * `useThemeStyles` is this bound to the active palette. Reach for this
 * directly when a component must render in a palette the user has *not*
 * selected yet — the Appearance list draws every option in the colors it is
 * offering so a look can be judged before it is chosen.
 *
 * `factory` is re-created on every render and therefore cannot be a dependency
 * itself. Keep it pure with respect to `colors`: if it closes over any other
 * outer value, pass it through `extraDeps`, otherwise the memo will return a
 * stale sheet and the change will be silently ignored.
 */
export function usePaletteStyles<T extends NamedStyles>(
  colors: ThemeColors,
  factory: (colors: ThemeColors) => T,
  extraDeps: readonly unknown[] = [],
): Readonly<T> {
  return useMemo(
    () => StyleSheet.create(factory(colors)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, ...extraDeps],
  );
}

/**
 * Builds a `StyleSheet` from the active palette and rebuilds it when the
 * theme changes.
 *
 * See `usePaletteStyles` for the memoization contract.
 */
export function useThemeStyles<T extends NamedStyles>(
  factory: (colors: ThemeColors) => T,
  extraDeps: readonly unknown[] = [],
): Readonly<T> {
  const colors = useThemeColors();

  return usePaletteStyles(colors, factory, extraDeps);
}
