import type { AgeRating, AgeRatingInfo, GameData } from "../../types";
import { useThemeStore } from "@/src/store/useThemeStore";
import { AGE_RATING_MAP } from "@gaming-zone/utils";
import type { ComponentType } from "react";
import {
  SteamIcon,
  EpicGamesIcon,
  GogIcon,
  NintendoSwitchIcon,
} from "@/src/components/icons/StoreIcons";
import {
  AppleIcon,
  GooglePlayIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";

export { AGE_RATING_MAP } from "@gaming-zone/utils";

// ── Store icon map ──────────────────────────────────────────────────────────

/**
 * Maps IGDB website type IDs to locally bundled store icons.
 */
export const STORE_ICONS: Record<
  number,
  ComponentType<{ size?: number; fill?: string }>
> = {
  13: SteamIcon,
  16: EpicGamesIcon,
  17: GogIcon,
  23: PlayStationIcon,
  22: XboxIcon,
  24: NintendoSwitchIcon,
  12: GooglePlayIcon,
  10: AppleIcon,
};

/**
 * Preferred display order for store tiles; icon-bearing types not listed
 * here are appended after these, in discovery order.
 */
export const STORE_ORDER = [13, 16, 17, 22, 23, 24, 12, 10];

/**
 * Store-root fallback URLs, one per icon-bearing type. Every real tile is
 * built from a website or a price (both carry their own link), so these
 * only ever apply as a last-resort guard.
 */
export const STORE_FALLBACK_URL: Record<number, string> = {
  13: "https://store.steampowered.com/",
  16: "https://store.epicgames.com/",
  17: "https://www.gog.com/",
  22: "https://www.xbox.com/en-US/games",
  23: "https://store.playstation.com/",
  24: "https://www.nintendo.com/us/store/all-games/",
  12: "https://play.google.com/store/games",
  10: "https://apps.apple.com/us/charts/iphone",
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
  // Unknown category: the rating colours above are semantic, so fall back to
  // the active palette's accent. Read imperatively because this helper is not
  // a component and cannot subscribe to the store.
  return useThemeStore.getState().colors.accent;
}

// ── Rating colours ──────────────────────────────────────────────────────────

/**
 * The aggregate-rating gradient moved to `src/constants/ratingColors.ts`
 * (Phase 4; docs/known-gaps.md §6) so card variants beside this screen can
 * share it. Re-exported here — both for this file's existing consumers and
 * for the still-present legacy section files — until those deletions land
 * in their follow-up PRs.
 */
export { getRatingGradient } from "@/src/constants/ratingColors";

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

/**
 * True when a game has not released yet.
 *
 * - `first_release_date` present → strictly in the future.
 * - `first_release_date` missing but `release_dates` exist → TBD upcoming title.
 * - Otherwise (no release info at all) → false.
 */
export function isUpcomingGame(game?: GameData | null): boolean {
  if (!game) return false;

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (typeof game.first_release_date === "number") {
    return game.first_release_date > nowInSeconds;
  }

  if (Array.isArray(game.release_dates) && game.release_dates.length > 0) {
    return true;
  }

  return false;
}
