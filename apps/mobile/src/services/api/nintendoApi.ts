/**
 * Nintendo eShop price lookup via our backend proxy.
 *
 * Nintendo exposes no official pricing API, so `/nintendo/search` resolves
 * the game's NSUID — from its IGDB product URL (page scrape) or a store
 * index search — and queries the eShop price endpoint server-side.
 * Prices are fetched at runtime and are never persisted.
 */
import apiClient from "./client";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NintendoSearchResult {
  name: string | null;
  /** Plain decimal string, e.g. "59.99" — "0.00" means the game is free. */
  price: string | null;
  /** Original price before discount, or null. */
  originalPrice: string | null;
  isOnSale: boolean;
  /** Nintendo store product page, or null when only the price was recovered. */
  url: string | null;
}

export interface NintendoSearchResponse {
  query: string | null;
  country: string;
  results: NintendoSearchResult[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website type ID for the Nintendo Store. */
const NINTENDO_IGDB_TYPE = 24;

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

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the current USD price for a game's Nintendo eShop listing.
 *
 * Returns `StorePrice` keyed to IGDB type 24 (Nintendo), or `null` when no
 * price can be determined (title not found, NSUID unresolvable, eShop
 * lookup failure).
 */
export async function fetchNintendoPrice(
  gameName: string,
  websites: Website[] | undefined,
  country = "US",
): Promise<StorePrice | null> {
  if (!gameName) return null;

  // IGDB's product URL short-circuits the store-index search server-side.
  const nintendoWebsite = websites?.find((w) => w.type === NINTENDO_IGDB_TYPE);

  try {
    const response = await apiClient.get<NintendoSearchResponse>("/nintendo/search", {
      params: { query: gameName, url: nintendoWebsite?.url, country },
      timeout: 10_000,
    });

    const result = response.data?.results?.[0] ?? null;

    const salePrice = parsePrice(result?.price);
    if (salePrice === null) return null;

    const normalPrice = parsePrice(result?.originalPrice) ?? salePrice;

    return {
      type: NINTENDO_IGDB_TYPE,
      salePrice,
      normalPrice,
      isOnSale: normalPrice > salePrice,
      url:
        result?.url ??
        nintendoWebsite?.url ??
        "https://www.nintendo.com/us/store/all-games/",
    };
  } catch {
    return null;
  }
}
