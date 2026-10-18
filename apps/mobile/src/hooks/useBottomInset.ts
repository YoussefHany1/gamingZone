import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/src/navigation/LiquidGlassTabBar";

/** Extra breathing room added between the floating tab bar and scroll content. */
const TAB_BAR_CONTENT_GAP = 26;

/**
 * Bottom padding scrollable content needs so its last rows are never obscured
 * by the floating glass tab bar, on any device geometry.
 *
 * Replaces the hand-tuned `paddingBottom: 90/70/40/…` magic numbers that were
 * previously copied per-screen: 64 (bar height) + 26 (gap) = the old 90 value
 * on devices without a bottom safe-area inset, and grows on gesture-nav
 * devices where an inset applies underneath the bar.
 */
export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_CONTENT_GAP;
}

/**
 * Top padding for floating overlay controls (back buttons, share buttons)
 * rendered on top of hero imagery — responsive instead of fixed `40`/`44`.
 */
export function useFloatingTopInset(margin = 0): number {
  const insets = useSafeAreaInsets();
  return insets.top + margin;
}
