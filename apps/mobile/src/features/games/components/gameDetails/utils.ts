import COLORS from "@/src/constants/colors";
import type { AgeRating, AgeRatingInfo } from "../../types";
import { AGE_RATING_MAP } from "@gaming-zone/utils";
import type { ComponentType } from "react";
import { SteamIcon, EpicGamesIcon, GogIcon, NintendoSwitchIcon } from "@/src/components/icons/StoreIcons";
import { AppleIcon, GooglePlayIcon, PlayStationIcon, XboxIcon } from "@/src/components/icons/BrandIcons";

export {
  AGE_RATING_MAP,
  extractSteamAppId,
  fetchSteamRequirements,
  parseSpecHtml,
} from "@gaming-zone/utils";

// ── Store icon map ──────────────────────────────────────────────────────────

/**
 * Maps IGDB website type IDs to locally bundled store icons.
 */
export const STORE_ICONS: Record<number, ComponentType<{ size?: number; fill?: string }>> = {
  13: SteamIcon,
  16: EpicGamesIcon,
  17: GogIcon,
  23: PlayStationIcon,
  22: XboxIcon,
  24: NintendoSwitchIcon,
  12: GooglePlayIcon,
  10: AppleIcon,
};

// ── Color utilities ─────────────────────────────────────────────────────────

/**
 * Returns a badge colour for IGDB age-rating categories.
 * Green  → all-ages ratings (PEGI 3 / ESRB RP–E)
 * Amber  → teen-rated categories
 * Red    → mature-rated categories
 */
export function getRatingColorCode(ratingCategory: number): string {
  if ([1, 2, 6, 7, 8].includes(ratingCategory)) return "#a5c400"; // green
  if ([3, 4, 9, 10].includes(ratingCategory)) return "#f4a200"; // amber
  if ([5, 11, 12].includes(ratingCategory)) return "#e3001b"; // red
  return COLORS.secondary;
}

/**
 * Returns a badge colour for a game's aggregate rating (0–100 scale).
 * Used for the score circle on the game detail page.
 */
export function getRatingColor(rating: number): string {
  if (rating <= 2) return "#8B0000"; // very poor
  if (rating <= 4) return "#FF4C4C"; // poor
  if (rating <= 6) return "#FFA500"; // average
  if (rating <= 8) return "#71e047"; // good
  return "#006400"; // excellent
}

/** Selects the most suitable age rating to display (ESRB preferred, PEGI fallback). */
export function getAgeRatingInfo(ratings?: AgeRating[]): AgeRatingInfo | null {
  if (!ratings?.length) return null;

  // Prefer ESRB (org 2) over PEGI (org 1)
  const selected =
    ratings.find((r) => r.organization === 2) ??
    ratings.find((r) => r.organization === 1);

  if (!selected) return null;

  return {
    label: AGE_RATING_MAP[selected.rating_category] ?? "?",
    color: getRatingColorCode(selected.rating_category),
  };
}
