/**
 * Apple App Store price lookup via the public iTunes Lookup API.
 *
 * IGDB lists the App Store twice — an "iTunes" website (type 10) and an
 * "App Store" website (type 11) — both pointing at the same app, so
 * either URL drives this lookup. The track ID is taken from the game's
 * own IGDB URL; there is no title search, because searching by name
 * happily finds companion apps and guides. Prices are fetched at
 * runtime and are never persisted.
 */
import axios from "axios";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ItunesLookupResult {
  trackName?: string;
  /** Price in the storefront's currency (pinned to US → USD). */
  price?: number;
  formattedPrice?: string;
  kind?: string;
}

interface ItunesLookupResponse {
  resultCount?: number;
  results?: ItunesLookupResult[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website types for the Apple App Store (iTunes + App Store). */
const APPLE_IGDB_TYPE = 10;
const APPLE_IGDB_ALT_TYPE = 11;

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the current USD price for a game's App Store listing.
 *
 * Returns `StorePrice` keyed to IGDB type 10 (App Store), or `null` when
 * the game has no App Store link, its track ID can't be read, or Apple
 * reports no price (some entries, e.g. Apple Arcade apps, omit it).
 */
export async function fetchAppStorePrice(
  websites: Website[] | undefined,
): Promise<StorePrice | null> {
  const appleWebsite = websites?.find(
    (w) => (w.type === APPLE_IGDB_TYPE || w.type === APPLE_IGDB_ALT_TYPE) && w.url,
  );
  if (!appleWebsite) return null;

  const trackId = appleWebsite.url.match(/\/id(\d+)/)?.[1];
  if (!trackId) return null;

  try {
    // country=us pins the storefront so `price` is reported in USD.
    const response = await axios.get<ItunesLookupResponse>(
      "https://itunes.apple.com/lookup",
      {
        params: { id: trackId, country: "us" },
        timeout: 8_000,
      },
    );

    const app = response.data?.results?.[0];
    // The price comes from the game's own listing (matched by the
    // IGDB-provided track ID), so $0 is a trustworthy "free app".
    if (!app || typeof app.price !== "number" || !Number.isFinite(app.price)) {
      return null;
    }

    const salePrice = app.price;
    return {
      type: APPLE_IGDB_TYPE,
      salePrice,
      normalPrice: salePrice,
      isOnSale: false,
      url: appleWebsite.url,
    };
  } catch {
    return null;
  }
}
