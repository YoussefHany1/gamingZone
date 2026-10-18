/**
 * Steam price lookup via the shared Steam appdetails fetch.
 *
 * The appdetails request is shared with the PC-requirements hook
 * (module-level in-flight cache in `@gaming-zone/utils`), so a game
 * details screen issues a single Steam request that feeds both sections.
 * Prices are fetched at runtime and are never persisted.
 */
import { extractSteamAppId, fetchSteamAppDetails } from "@gaming-zone/utils";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website type ID for Steam. */
const STEAM_IGDB_TYPE = 13;

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the current USD price for a game's Steam store listing.
 *
 * Returns `StorePrice` keyed to IGDB type 13 (Steam), or `null` when the
 * game has no Steam link or Steam reports no price.
 */
export async function fetchSteamPrice(
  websites: Website[] | undefined,
): Promise<StorePrice | null> {
  const appId = extractSteamAppId(websites);
  if (!appId) return null;

  try {
    const { priceOverview, isFree } = await fetchSteamAppDetails(appId);

    let salePrice: number;
    let normalPrice: number;
    let isOnSale: boolean;

    if (priceOverview) {
      // Steam amounts are in cents; the stores row renders whole dollars.
      salePrice = priceOverview.final / 100;
      normalPrice = priceOverview.initial / 100;
      isOnSale = priceOverview.discountPercent > 0 && salePrice < normalPrice;
    } else if (isFree) {
      // Free-to-play apps sometimes omit `price_overview` entirely.
      salePrice = 0;
      normalPrice = 0;
      isOnSale = false;
    } else {
      return null;
    }

    return {
      type: STEAM_IGDB_TYPE,
      salePrice,
      normalPrice,
      isOnSale,
      url: `https://store.steampowered.com/app/${appId}/`,
    };
  } catch {
    return null;
  }
}
