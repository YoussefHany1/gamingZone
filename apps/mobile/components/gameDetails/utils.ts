import axios from "axios";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import type {
  AgeRating,
  AgeRatingInfo,
  GameData,
  PcRequirements,
  SpecRow,
  Website,
} from "./types";

// ─── Age-rating lookup tables ─────────────────────────────────────────────────

/** Maps IGDB rating_category → human-readable age label */
export const AGE_RATING_MAP: Record<number, string> = {
  // PEGI
  1: "3+", 2: "7+", 3: "12+", 4: "16+", 5: "18+",
  // ESRB
  6: "RP", 7: "EC", 8: "E", 9: "E10+", 10: "T", 11: "M", 12: "AO",
};

// ─── Store icon map ───────────────────────────────────────────────────────────

/**
 * Maps IGDB website type IDs to locally bundled store icons.
 * require() calls must be at module level to satisfy Metro's static analysis.
 */
export const STORE_ICONS: Record<number, ReturnType<typeof require>> = {
  13: require("../../assets/steam.webp"),
  16: require("../../assets/epic-games.webp"),
  17: require("../../assets/gog.webp"),
  23: require("../../assets/playstation.webp"),
  22: require("../../assets/xbox.webp"),
  24: require("../../assets/nintendo-switch.webp"),
  12: require("../../assets/play-store.webp"),
  10: require("../../assets/apple-store.webp"),
};

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Extracts the Steam App ID from a game's website list, or returns null. */
export function extractSteamAppId(websites?: Website[]): string | null {
  const steamSite = websites?.find((w) => w.type === 13);
  if (!steamSite) return null;
  const match = steamSite.url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match?.[1] ?? null;
}

/** Parses Steam's HTML PC requirements blob into structured label/value rows. */
export function parseSpecHtml(html: string): SpecRow[] {
  const lines = html
    // Convert closing list-item and line-break tags to newlines; strip everything else
    .replace(/<[^>]+>/g, (tag) => {
      const lower = tag.toLowerCase();
      if (lower.startsWith("</li") || lower.startsWith("<br")) return "\n";
      return "";
    })
    .split("\n");

  const rows: SpecRow[] = [];

  for (const line of lines) {
    const clean = line
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!clean) continue;

    const colonIdx = clean.indexOf(":");
    if (colonIdx <= 0) continue;

    const label = clean.slice(0, colonIdx).replace(/\s*\*$/, "").trim();
    const value = clean.slice(colonIdx + 1).trim();

    if (label && value && !/additional/i.test(label)) {
      rows.push({ label, value });
    }
  }

  return rows;
}

/** Fetches PC system requirements for a Steam app from the Steam API. */
export async function fetchSteamRequirements(
  appId: string,
): Promise<PcRequirements | null> {
  try {
    const res = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { timeout: 8000 },
    );
    const data = res.data?.[appId];
    if (!data?.success || !data?.data?.pc_requirements) return null;

    const { minimum, recommended } = data.data.pc_requirements;
    return {
      minimum: minimum ? parseSpecHtml(minimum) : [],
      recommended: recommended ? parseSpecHtml(recommended) : [],
    };
  } catch {
    return null;
  }
}

/** Fetches full game details from the GamingZone backend. */
export async function fetchGameById(id: number | string): Promise<GameData> {
  if (!id) throw new Error("fetchGameById: id is required");

  try {
    const res = await axios.get<GameData>(`${SERVER_URL}/game-details`, {
      params: { id },
    });
    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Server error: ${error.response.status}`);
      }
      throw new Error("Network error — check your connection.");
    }
    throw error;
  }
}

// ─── Color utilities ──────────────────────────────────────────────────────────

/**
 * Returns a badge colour for IGDB age-rating categories.
 * Green  → all-ages ratings (PEGI 3 / ESRB RP–E)
 * Amber  → teen-rated categories
 * Red    → mature-rated categories
 */
export function getRatingColorCode(ratingCategory: number): string {
  if ([1, 2, 6, 7, 8].includes(ratingCategory)) return "#a5c400"; // green
  if ([3, 4, 9, 10].includes(ratingCategory))   return "#f4a200"; // amber
  if ([5, 11, 12].includes(ratingCategory))      return "#e3001b"; // red
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
  return "#006400";                  // excellent
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
