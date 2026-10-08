/**
 * Shared pure utilities for Gaming Zone — used by both the web (Next.js) and
 * mobile (React Native / Expo) apps. No platform-specific code here.
 */
import axios from "axios";
import type {
  CountdownResult,
  GameTimeToBeat,
  LangRow,
  LanguageSupport,
  PcRequirements,
  PlayTime,
  SpecRow,
  Website,
} from "@gaming-zone/core";

// ---------------------------------------------------------------------------
// Age ratings
// ---------------------------------------------------------------------------

/**
 * Maps IGDB rating_category → human-readable age label.
 * 1–5 are PEGI; 6–12 are ESRB.
 */
export const AGE_RATING_MAP: Record<number, string> = {
  // PEGI
  1: "3+",
  2: "7+",
  3: "12+",
  4: "16+",
  5: "18+",
  // ESRB
  6: "RP",
  7: "EC",
  8: "E",
  9: "E10+",
  10: "T",
  11: "M",
  12: "AO",
};

/** Returns the age label for an IGDB rating category (defaults to "RP"). */
export function getAgeRatingLabel(ratingCategory: number): string {
  return AGE_RATING_MAP[ratingCategory] ?? "RP";
}

// ---------------------------------------------------------------------------
// Steam PC requirements
// ---------------------------------------------------------------------------

/** Extracts the Steam App ID from a game's website list, or returns null. */
export function extractSteamAppId(websites?: Website[]): string | null {
  if (!websites) return null;
  const steamSite = websites.find((w) => w.type === 13);
  if (!steamSite) return null;
  const match = steamSite.url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? (match[1] ?? null) : null;
}

/** Parses Steam's HTML PC requirements blob into structured label/value rows. */
export function parseSpecHtml(html: string): SpecRow[] {
  const stripped = html.replace(/<[^>]+>/g, (tag) => {
    const lower = tag.toLowerCase();
    if (lower.startsWith("</li") || lower.startsWith("<br")) return "\n";
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
    if (colonIdx <= 0) return;

    const label = clean.slice(0, colonIdx).replace(/\s*\*$/, "").trim();
    const value = clean.slice(colonIdx + 1).trim();
    if (label && value && !/additional/i.test(label)) {
      rows.push({ label, value });
    }
  });

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

// ---------------------------------------------------------------------------
// Game details
// ---------------------------------------------------------------------------

/** Converts HowLongToBeat seconds → hours for each completion profile. */
export function formatPlayTime(
  gameTimeToBeats?: GameTimeToBeat,
): PlayTime | null {
  if (!gameTimeToBeats) return null;
  return {
    main: gameTimeToBeats.hastily
      ? Math.floor(gameTimeToBeats.hastily / 3600)
      : null,
    mainExtra: gameTimeToBeats.normally
      ? Math.floor(gameTimeToBeats.normally / 3600)
      : null,
    completionist: gameTimeToBeats.completely
      ? Math.floor(gameTimeToBeats.completely / 3600)
      : null,
  };
}

/**
 * Folds language_supports into { name, Audio, Subtitles, Interface } rows,
 * sorted alphabetically by language name.
 */
export function formatLanguageRows(
  languageSupports?: LanguageSupport[],
): LangRow[] {
  if (!languageSupports) return [];

  const languageMap: Record<
    string,
    { Audio: boolean; Subtitles: boolean; Interface: boolean }
  > = {};

  languageSupports.forEach((sup) => {
    if (!sup.language || !sup.language_support_type) return;
    const langName = sup.language.name;
    const supportTypeName = sup.language_support_type.name;

    const supports =
      languageMap[langName] ?? {
        Audio: false,
        Subtitles: false,
        Interface: false,
      };
    languageMap[langName] = supports;

    if (supportTypeName === "Audio") supports.Audio = true;
    if (supportTypeName === "Subtitles") supports.Subtitles = true;
    if (supportTypeName === "Interface") supports.Interface = true;
  });

  return Object.entries(languageMap)
    .map(([name, supports]) => ({ name, ...supports }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventStatus = "upcoming" | "live" | "ended";

/** Derives an event's lifecycle status from its start/end Unix timestamps (seconds). */
export function getEventStatus(
  startTime: number,
  endTime: number,
): EventStatus {
  const now = Date.now() / 1000;
  if (now < startTime) return "upcoming";
  if (now <= endTime) return "live";
  return "ended";
}

/** Formats an event timestamp (seconds) as a localized long date string. */
export function formatEventDate(
  timestamp: number,
  locale: string = "en",
): string {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const localeString = locale === "ar" ? "ar-EG" : "en-US";
  return date.toLocaleDateString(localeString, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formats an event timestamp (seconds) as a compact card date (e.g. "Aug 8, 12:30 PM"). */
export function formatEventDateShort(
  timestamp: number,
  locale: string = "en",
): string {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const localeString = locale === "ar" ? "ar-EG" : "en-US";
  return date.toLocaleDateString(localeString, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------

/**
 * Countdown math. Numeric targets are Unix timestamps (seconds); string
 * targets are date strings. Returns null when the target is in the past.
 */
export function computeTimeLeft(
  target: number | string,
): CountdownResult | null {
  const targetDate =
    typeof target === "number" ? new Date(target * 1000) : new Date(target);
  const distance = targetDate.getTime() - Date.now();
  if (distance <= 0) return null;

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / 1000 / 60) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

// ---------------------------------------------------------------------------
// IGDB images
// ---------------------------------------------------------------------------

/** Builds an IGDB image URL for a given image id and size token (e.g. "cover_big"). */
export function igdbImageUrl(imageId: string, size: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.webp`;
}
