/**
 * Google Play price lookup via our backend proxy.
 *
 * Google serves the Play Store app page with a structured-data price
 * meta tag, so `/play/search` scrapes it server-side with browser
 * headers and a US-pinned locale. The lookup is driven by the game's
 * IGDB Google Play website — there is no title search, because the
 * IGDB link is the authoritative pointer to the game's own listing.
 * Prices are fetched at runtime and are never persisted.
 */
import apiClient from "./client";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlaySearchResponse {
  packageId: string | null;
  /** Plain decimal string, e.g. "6.99" — "0.00" means the app is free. */
  price: string | null;
  url: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website type ID for the Google Play Store. */
const GOOGLE_PLAY_IGDB_TYPE = 12;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses a backend price string ("6.99", "$6.99") into a plain number.
 * Returns null when the string isn't parseable.
 */
function parsePrice(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const value = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(value) ? null : value;
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the current USD price for a game's Google Play listing.
 *
 * Returns `StorePrice` keyed to IGDB type 12 (Google Play), or `null`
 * when the game has no Play Store link or no price could be read.
 */
export async function fetchGooglePlayPrice(
  websites: Website[] | undefined,
): Promise<StorePrice | null> {
  const playWebsite = websites?.find((w) => w.type === GOOGLE_PLAY_IGDB_TYPE);
  if (!playWebsite?.url) return null;

  try {
    const response = await apiClient.get<PlaySearchResponse>("/play/search", {
      params: { url: playWebsite.url },
      timeout: 10_000,
    });

    // The price comes from the game's own listing page (matched by the
    // IGDB-provided package URL), so $0 is a trustworthy "free app".
    const salePrice = parsePrice(response.data?.price);
    if (salePrice === null) return null;

    return {
      type: GOOGLE_PLAY_IGDB_TYPE,
      salePrice,
      normalPrice: salePrice,
      isOnSale: false,
      url: playWebsite.url,
    };
  } catch {
    return null;
  }
}
