import axios from "axios";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import type { AgeRating, AgeRatingInfo, GameData, PcRequirements, SpecRow, Website } from "./types";

// Constants

export const AGE_RATING_MAP: Record<number, string> = {
  1: "3+", 2: "7+", 3: "12+", 4: "16+", 5: "18+",
  6: "RP", 7: "3+", 8: "3+", 9: "10+", 10: "13+", 11: "17+", 12: "18+",
};

// require() calls must be at module level for static assets
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

// Helper Functions

export function extractSteamAppId(websites?: Website[]): string | null {
  if (!websites) return null;
  const steamSite = websites.find((w) => w.type === 13);
  if (!steamSite) return null;
  const match = steamSite.url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? match[1] : null;
}

export function parseSpecHtml(html: string): SpecRow[] {
  const stripped = html.replace(/<[^>]+>/g, (tag) => {
    const lower = tag.toLowerCase();
    if (lower.startsWith("</li")) return "\n";
    if (lower.startsWith("<br")) return "\n";
    return "";
  });
  const rows: SpecRow[] = [];
  stripped.split("\n").forEach((line) => {
    const clean = line
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!clean) return;
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0) {
      const label = clean.slice(0, colonIdx).replace(/\s*\*$/, "").trim();
      const value = clean.slice(colonIdx + 1).trim();
      if (label && value && !/additional/i.test(label)) rows.push({ label, value });
    }
  });
  return rows;
}

export async function fetchSteamRequirements(appId: string): Promise<PcRequirements | null> {
  try {
    const res = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { timeout: 8000 }
    );
    const data = res.data?.[appId];
    if (!data?.success || !data?.data?.pc_requirements) return null;
    const reqs = data.data.pc_requirements;
    return {
      minimum: reqs.minimum ? parseSpecHtml(reqs.minimum) : [],
      recommended: reqs.recommended ? parseSpecHtml(reqs.recommended) : [],
    };
  } catch {
    return null;
  }
}

export async function fetchGameById(id: number | string): Promise<GameData> {
  if (!id) throw new Error("fetchGameById: missing id");
  try {
    const res = await axios.get<GameData>(`${SERVER_URL}/game-details`, {
      params: { id },
    });
    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) throw new Error(`Server fetch failed: ${error.response.status}`);
      throw new Error("Network Error");
    }
    throw error;
  }
}

export function getRatingColorCode(ratingVal: number): string {
  if ([1, 2, 6, 7, 8].includes(ratingVal)) return "#a5c400";
  if ([3, 4, 9, 10].includes(ratingVal)) return "#f4a200";
  if ([5, 11, 12].includes(ratingVal)) return "#e3001b";
  return COLORS.secondary;
}

export function getAgeRatingInfo(ratings?: AgeRating[]): AgeRatingInfo | null {
  if (!ratings?.length) return null;
  const selected = ratings.find((r) => r.organization === 2) ?? ratings.find((r) => r.organization === 1);
  if (!selected) return null;
  return {
    label: AGE_RATING_MAP[selected.rating_category] ?? "?",
    color: getRatingColorCode(selected.rating_category),
  };
}

export function getRatingColor(rating: number): string {
  if (rating <= 2) return "#8B0000";
  if (rating <= 4) return "#FF4C4C";
  if (rating <= 6) return "#FFA500";
  if (rating <= 8) return "#71e047";
  return "#006400";
}
