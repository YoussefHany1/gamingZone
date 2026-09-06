/**
 * PlayStation Store price lookup via our backend proxy.
 *
 * Sony does not expose a public pricing API, so we hit our own
 * `/psn/search` endpoint which queries the PSN internal search API
 * and returns structured JSON.  Prices are fetched at runtime and are
 * never persisted — they live only in component state.
 */
import apiClient from "./client";
import type { Website } from "@/src/features/games/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PsnSearchResult {
  id: string | null;
  name: string | null;
  imageUrl: string | null;
  /** Display string, e.g. "$69.99" or "Free" — may be null if unavailable. */
  price: string | null;
  /** Original price before discount, or null. */
  originalPrice: string | null;
  isOnSale: boolean;
  url: string;
  contentType: string | null;
  platforms: string[];
}

export interface PsnSearchResponse {
  query: string;
  country: string;
  results: PsnSearchResult[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** IGDB website type ID for PlayStation Store. */
const PSN_IGDB_TYPE = 23;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalises a game title for fuzzy matching against PSN result names. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Parses a PSN display-price string into a plain number (USD).
 * Returns null when the string isn't parseable (e.g. "Free", null, empty).
 */
function parsePsnPrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  // Strip currency symbols and commas, then parse
  const numeric = raw.replace(/[^0-9.]/g, "");
  const value = parseFloat(numeric);
  return isNaN(value) ? null : value;
}

/**
 * Picks the best PSN result for the given game name.
 * Tries an exact normalised-title match first, then falls back to the
 * first result that contains all significant words of the game name.
 */
function pickBestResult(
  gameName: string,
  results: PsnSearchResult[],
): PsnSearchResult | null {
  if (!results.length) return null;

  const normalized = normalizeTitle(gameName);

  // 1. Exact normalised match
  const exact = results.find(
    (r) => r.name && normalizeTitle(r.name) === normalized,
  );
  if (exact) return exact;

  // 2. Starts-with match (handles subtitles)
  const startsWith = results.find(
    (r) => r.name && normalizeTitle(r.name).startsWith(normalized),
  );
  if (startsWith) return startsWith;

  // 3. All significant words present
  const words = normalized.split(" ").filter((w) => w.length > 3);
  const wordMatch = results.find((r) => {
    if (!r.name) return false;
    const rNorm = normalizeTitle(r.name);
    return words.every((w) => rNorm.includes(w));
  });
  if (wordMatch) return wordMatch;

  // 4. Fall back to first result if only one is returned
  return results.length === 1 ? (results[0] ?? null) : null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches the PlayStation Store price for a game via our backend proxy.
 *
 * Returns a `StorePrice`-compatible object keyed to IGDB type 23
 * (PlayStation Store), or `null` when no price can be determined.
 */
export async function fetchPsnPrice(
  gameName: string,
  websites: Website[] | undefined,
  country = "US",
): Promise<{
  type: number;
  salePrice: number;
  normalPrice: number;
  isOnSale: boolean;
  url: string;
} | null> {
  // Only fetch if the game has a PlayStation Store website
  const hasPsn = websites?.some((w) => w.type === PSN_IGDB_TYPE);
  if (!hasPsn || !gameName) return null;

  try {
    const response = await apiClient.get<PsnSearchResponse>("/psn/search", {
      params: { query: gameName, country },
      timeout: 10_000,
    });

    const results = response.data?.results ?? [];
    const best = pickBestResult(gameName, results);
    if (!best) return null;

    const salePrice = parsePsnPrice(best.price);
    if (salePrice === null) return null; // "Free", unavailable, etc.

    const normalPrice = parsePsnPrice(best.originalPrice) ?? salePrice;
    const isOnSale = best.isOnSale && normalPrice > salePrice;

    // Prefer the direct PSN product URL, fall back to the site's own URL
    const psnWebsite = websites?.find((w) => w.type === PSN_IGDB_TYPE);
    const url = best.url ?? psnWebsite?.url ?? "https://store.playstation.com";

    return {
      type: PSN_IGDB_TYPE,
      salePrice,
      normalPrice,
      isOnSale,
      url,
    };
  } catch {
    return null;
  }
}
