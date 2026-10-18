/**
 * PlayStation Store price lookup via our backend proxy.
 *
 * Sony does not expose a public pricing API, so we hit our own
 * `/psn/search` endpoint which queries the PSN internal search API
 * and returns structured JSON.  Prices are fetched at runtime and are
 * never persisted — they live only in component state.
 */
import apiClient from "./client";
import { normalizeGameTitle } from "@gaming-zone/utils";
import type { StorePrice, Website } from "@/src/features/games/types";

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

  const normalized = normalizeGameTitle(gameName);

  // 1. Exact normalised match
  const exact = results.find((r) => r.name && normalizeGameTitle(r.name) === normalized);
  if (exact) return exact;

  // 2. Starts-with match (handles subtitles)
  const startsWith = results.find(
    (r) => r.name && normalizeGameTitle(r.name).startsWith(normalized),
  );
  if (startsWith) return startsWith;

  // 3. Includes full normalised name (handles prefixes e.g. Marvel's)
  const includesMatch = results.find(
    (r) => r.name && normalizeGameTitle(r.name).includes(normalized),
  );
  if (includesMatch) return includesMatch;

  // 4. All significant words present
  const words = normalized.split(" ").filter((w) => w.length > 2);
  if (words.length > 0) {
    const wordMatch = results.find((r) => {
      if (!r.name) return false;
      const rNorm = normalizeGameTitle(r.name);
      return words.every((w) => rNorm.includes(w));
    });
    if (wordMatch) return wordMatch;
  }

  // 5. Fall back to highest-relevance result
  return results[0] ?? null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches the PlayStation Store price for a game via our backend proxy.
 *
 * Sony does not expose a public pricing API, so this hits our own
 * `/psn/search` endpoint which queries the PSN internal search API
 * and returns structured JSON.
 *
 * Returns a `StorePrice` keyed to IGDB type 23 (PlayStation Store), or
 * `null` when no price can be determined.
 */
export async function fetchPsnPrice(
  gameName: string,
  websites: Website[] | undefined,
  country = "US",
): Promise<StorePrice | null> {
  if (!gameName) return null;

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
