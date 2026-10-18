/**
 * Xbox (Microsoft Store) price lookup via our backend proxy.
 *
 * Microsoft's DisplayCatalog is queried by our `/xbox/search` endpoint,
 * which ranks autosuggest candidates and returns a trimmed price block —
 * the raw Details payload is hundreds of KB and must not reach the client.
 * Prices are fetched at runtime and are never persisted.
 */
import apiClient from "./client";
import { normalizeGameTitle } from "@gaming-zone/utils";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface XboxSearchResult {
  name: string | null;
  /** Plain decimal string, e.g. "59.99" — "0.00" means the game is free. */
  price: string | null;
  /** Original price before discount, or null. */
  originalPrice: string | null;
  isOnSale: boolean;
  url: string | null;
}

export interface XboxSearchResponse {
  query: string;
  market: string;
  results: XboxSearchResult[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website type ID for the Xbox / Microsoft Store. */
const XBOX_IGDB_TYPE = 22;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses a backend price string ("59.99", "$59.99") into a plain number.
 * Returns null when the string isn't parseable.
 */
function parsePrice(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const value = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(value) ? null : value;
}

/**
 * The backend already ranks its candidates; re-check the normalised title
 * because IGDB names can differ in punctuation, then trust its first pick.
 */
function pickBestResult(
  gameName: string,
  results: XboxSearchResult[],
): XboxSearchResult | null {
  if (!results.length) return null;

  const normalized = normalizeGameTitle(gameName);

  const exact = results.find((r) => r.name && normalizeGameTitle(r.name) === normalized);
  if (exact) return exact;

  const startsWith = results.find(
    (r) => r.name && normalizeGameTitle(r.name).startsWith(normalized),
  );
  if (startsWith) return startsWith;

  return results[0] ?? null;
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the current USD price for a game's Microsoft Store listing.
 *
 * Returns `StorePrice` keyed to IGDB type 22 (Xbox), or `null` when no
 * price can be determined.
 */
export async function fetchXboxPrice(
  gameName: string,
  websites: Website[] | undefined,
  market = "US",
): Promise<StorePrice | null> {
  if (!gameName) return null;

  try {
    const response = await apiClient.get<XboxSearchResponse>("/xbox/search", {
      params: { query: gameName, market },
      timeout: 10_000,
    });

    const best = pickBestResult(gameName, response.data?.results ?? []);

    const salePrice = parsePrice(best?.price);
    if (salePrice === null) return null;

    const normalPrice = parsePrice(best?.originalPrice) ?? salePrice;
    const xboxWebsite = websites?.find((w) => w.type === XBOX_IGDB_TYPE);

    return {
      type: XBOX_IGDB_TYPE,
      salePrice,
      normalPrice,
      isOnSale: normalPrice > salePrice,
      url: best?.url ?? xboxWebsite?.url ?? "https://www.xbox.com/en-US/games",
    };
  } catch {
    return null;
  }
}
