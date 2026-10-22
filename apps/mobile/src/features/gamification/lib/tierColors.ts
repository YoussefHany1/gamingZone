import type { AchievementTier } from "@gaming-zone/core";
import { useIsDark } from "@/src/hooks/useTheme";

/**
 * The badge tier colours.
 *
 * The theme has no metal tokens, and the tiers have to read as *tiers*, so
 * they carry their own pair of hues — one for the light scheme and one for
 * the dark. Both are picked for legibility against their own background
 * rather than derived from the accent, because a bronze that is tinted by
 * the accent stops looking like bronze.
 */
const TIER_COLORS: Record<AchievementTier, { light: string; dark: string }> = {
  bronze: { light: "#a35a1f", dark: "#e0975a" },
  silver: { light: "#5d6b80", dark: "#c3cfe0" },
  gold: { light: "#8a6a12", dark: "#e8c25a" },
};

/** The colour of a badge tier for the active scheme. */
export function useTierColor(tier: AchievementTier): string {
  const isDark = useIsDark();
  return TIER_COLORS[tier][isDark ? "dark" : "light"];
}
