/**
 * Shared pure utilities for Gaming Zone — used by both the web (Next.js) and
 * mobile (React Native / Expo) apps. No platform-specific code here.
 */
import axios from "axios";
import type {
  ArticleSummaryKey,
  CountdownResult,
  GameTimeToBeat,
  LangRow,
  LanguageSupport,
  PlayTime,
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
// Steam app details (prices)
// ---------------------------------------------------------------------------

/** Extracts the Steam App ID from a game's website list, or returns null. */
export function extractSteamAppId(websites?: Website[]): string | null {
  if (!websites) return null;
  const steamSite = websites.find((w) => w.type === 13);
  if (!steamSite) return null;
  const match = steamSite.url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? (match[1] ?? null) : null;
}

/** `price_overview` fragment of Steam's appdetails payload. Amounts are in cents (request pinned to `cc=US`, so USD). */
export type SteamPriceOverview = {
  currency: string;
  /** Price in cents before any discount. */
  initial: number;
  /** Price in cents after any discount. */
  final: number;
  /** Discount percentage Steam displays (0 when not discounted). */
  discountPercent: number;
};

/** Trimmed subset of Steam's appdetails payload used by the store-price consumers. */
export type SteamAppDetails = {
  /** Null when Steam omits `price_overview` and the app isn't free. */
  priceOverview: SteamPriceOverview | null;
  /** True when Steam reports the app as free (`is_free`). */
  isFree: boolean;
};

/** Oldest appdetails results evicted once the shared cache outgrows this size. */
const STEAM_DETAILS_CACHE_LIMIT = 32;
/** How long one app's appdetails result is reused between consumers. */
const STEAM_DETAILS_TTL_MS = 5 * 60_000;

const steamDetailsCache = new Map<
  string,
  { promise: Promise<SteamAppDetails>; expiresAt: number }
>();

async function fetchSteamAppDetailsUncached(appId: string): Promise<SteamAppDetails> {
  try {
    // cc=US pins the currency so `price_overview` always matches the "$"
    // rendering used by the stores row.
    const res = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=US`,
      { timeout: 8000 },
    );
    const data = res.data?.[appId];
    if (!data?.success || !data?.data) {
      return { priceOverview: null, isFree: false };
    }

    const { price_overview: overview, is_free: isFree } = data.data;

    return {
      priceOverview: overview
        ? {
            currency: String(overview.currency ?? ""),
            initial: Number(overview.initial ?? 0),
            final: Number(overview.final ?? 0),
            discountPercent: Number(overview.discount_percent ?? 0),
          }
        : null,
      isFree: Boolean(isFree),
    };
  } catch {
    return { priceOverview: null, isFree: false };
  }
}

/**
 * Fetches Steam's appdetails for a Steam app, deduplicated through a
 * module-level cache so the store-price lookups share a single request
 * instead of issuing one each.
 *
 * Never rejects — failed lookups resolve to all-null fields and are evicted
 * from the cache so the next consumer retries.
 */
export function fetchSteamAppDetails(appId: string): Promise<SteamAppDetails> {
  const cached = steamDetailsCache.get(appId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = fetchSteamAppDetailsUncached(appId);
  steamDetailsCache.set(appId, { promise, expiresAt: now + STEAM_DETAILS_TTL_MS });

  // Bound memory: evict the oldest entry (unless it's the one just added).
  if (steamDetailsCache.size > STEAM_DETAILS_CACHE_LIMIT) {
    const oldestKey = steamDetailsCache.keys().next().value;
    if (oldestKey !== undefined && oldestKey !== appId) steamDetailsCache.delete(oldestKey);
  }
  // Empty results (fetch failed, app not found) are retried on next access
  // instead of being cached for the full TTL.
  promise.then((details) => {
    const isEmpty = !details.priceOverview && !details.isFree;
    if (isEmpty && steamDetailsCache.get(appId)?.promise === promise) {
      steamDetailsCache.delete(appId);
    }
  });

  return promise;
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
// AI article summaries
// ---------------------------------------------------------------------------

/**
 * Maps an app locale to the Appwrite `articles` attribute holding that
 * language's AI summary. Single source of truth for the read side (web +
 * mobile); the backend job keeps a mirrored write-side map.
 */
const SUMMARY_KEY_BY_LOCALE: Record<string, ArticleSummaryKey> = {
  en: "summary_en",
  ar: "summary_ar",
  es: "summary_es",
  fr: "summary_fr",
  hi: "summary_hi",
  "pt-BR": "summary_pt_br",
  "pt-PT": "summary_pt_pt",
};

/**
 * Resolves the summary attribute key for a locale, falling back through the
 * bare language code and finally to English.
 */
export function getSummaryKey(locale: string): ArticleSummaryKey {
  const normalized = (locale || "").trim();
  const direct = SUMMARY_KEY_BY_LOCALE[normalized];
  if (direct) return direct;

  const base = normalized.split("-")[0] ?? "";
  return SUMMARY_KEY_BY_LOCALE[base] ?? "summary_en";
}

/**
 * Returns the AI summary for the given locale, falling back to the English
 * summary (and then to an empty string) when it is missing or blank.
 */
export function getArticleSummary(
  article: Partial<Record<ArticleSummaryKey, string | undefined>>,
  locale: string,
): string {
  const localized = article[getSummaryKey(locale)];
  if (localized && localized.trim()) return localized;

  const english = article.summary_en;
  return english && english.trim() ? english : "";
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
// Title normalization
// ---------------------------------------------------------------------------

/** Normalizes a game title for fuzzy comparisons (lowercase, single-spaced). */
export function normalizeGameTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// IGDB images
// ---------------------------------------------------------------------------

/** Builds an IGDB image URL for a given image id and size token (e.g. "cover_big"). */
export function igdbImageUrl(
  imageId: string | null | undefined,
  size: string,
): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${String(imageId)}.webp`;
}

// ---------------------------------------------------------------------------
// Gamification
// ---------------------------------------------------------------------------

export * from "./gamification";

// ---------------------------------------------------------------------------
// PC specifications + compatibility
// ---------------------------------------------------------------------------

export * from "./pc";

