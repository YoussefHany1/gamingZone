/**
 * CheapShark API endpoints for live store deals/prices.
 *
 * CheapShark is a free, keyless price-aggregation API for PC stores
 * (Steam, Epic, GOG, and more). Prices are fetched at runtime and are
 * never persisted to the database — they live only in component state.
 */
import axios from "axios";
import { extractSteamAppId, normalizeGameTitle } from "@gaming-zone/utils";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheapSharkDeal {
  internalName: string;
  title: string;
  gameID: string;
  storeID: string;
  salePrice: string;
  normalPrice: string;
  isOnSale: string;
  steamAppID?: string | null;
  dealID: string;
  metacriticScore?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CHEAPSHARK_BASE_URL = "https://www.cheapshark.com/api/1.0";
const CHEAPSHARK_USER_AGENT = "GamingZone/1.0 (contact@example.com)";

const STEAM_IGDB_TYPE = 13;
const EPIC_IGDB_TYPE = 16;
const GOG_IGDB_TYPE = 17;

/**
 * Maps CheapShark store IDs to the IGDB website types each store icon uses.
 * Only stores we render icons for (Steam, Epic, GOG) are listed.
 */
const CHEAPSHARK_STORE_TO_IGDB_TYPE: Record<string, number> = {
  "1": STEAM_IGDB_TYPE, // Steam
  "7": GOG_IGDB_TYPE, // GOG
  "25": EPIC_IGDB_TYPE, // Epic Games Store
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Picks the cheapest live deal among one or more matching deals. */
function pickBestDeal(deals: CheapSharkDeal[]): CheapSharkDeal | null {
  if (!deals.length) return null;
  return deals.reduce((best, deal) =>
    Number(deal.salePrice) < Number(best.salePrice) ? deal : best,
  );
}

/**
 * Matches CheapShark deals to a specific IGDB game.
 *
 * Matching is done in three passes, most reliable first:
 * 1. Steam App ID match — most reliable when the game has a Steam website.
 * 2. Normalised title match.
 * 3. Every significant word of the game title appears in the deal's name
 *    (handles renamed editions such as "… — Remastered").
 *
 * A game that matches none of the passes gets **no price** rather than the
 * first deal CheapShark happened to return — a wrong price is worse than a
 * missing one.
 */
export function matchCheapSharkDeals(
  gameName: string,
  websites: Website[] | undefined,
  deals: CheapSharkDeal[],
): CheapSharkDeal[] {
  if (!deals?.length) return [];

  const steamAppId = extractSteamAppId(websites);

  if (steamAppId) {
    const appIdMatches = deals.filter(
      (deal) => deal.steamAppID && String(steamAppId) === String(deal.steamAppID),
    );
    if (appIdMatches.length) return appIdMatches;
  }

  const normalizedName = normalizeGameTitle(gameName);
  const titleMatches = deals.filter(
    (deal) => normalizeGameTitle(deal.title) === normalizedName,
  );
  if (titleMatches.length) return titleMatches;

  // Require *every* significant word of the title in the deal name — a
  // single shared word ("Wild", "Storm", …) would cross-match unrelated games.
  const significantWords = normalizedName.split(" ").filter((word) => word.length > 3);
  if (!significantWords.length) return [];

  return deals.filter((deal) => {
    const internal = normalizeGameTitle(deal.internalName);
    const title = normalizeGameTitle(deal.title);
    return significantWords.every((word) => internal.includes(word) || title.includes(word));
  });
}

/**
 * Builds per-store prices from CheapShark deals, aligned to the game's
 * IGDB website types so each store icon can show its own price.
 */
export function buildStorePrices(
  gameName: string,
  websites: Website[] | undefined,
  deals: CheapSharkDeal[],
): StorePrice[] {
  const matched = matchCheapSharkDeals(gameName, websites, deals);

  const byIgdbType = new Map<number, CheapSharkDeal[]>();
  for (const deal of matched) {
    const igdbType = CHEAPSHARK_STORE_TO_IGDB_TYPE[deal.storeID];
    if (igdbType == null) continue;
    const list = byIgdbType.get(igdbType) ?? [];
    list.push(deal);
    byIgdbType.set(igdbType, list);
  }

  const prices: StorePrice[] = [];
  for (const [igdbType, typeDeals] of byIgdbType) {
    const best = pickBestDeal(typeDeals);
    if (!best) continue;
    prices.push({
      type: igdbType,
      salePrice: Number(best.salePrice),
      normalPrice: Number(best.normalPrice),
      isOnSale: best.isOnSale === "1",
      url: `https://www.cheapshark.com/deals?dealID=${best.dealID}`,
    });
  }

  return prices;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * Fetches live per-store deals for a game title from CheapShark.
 * Returns an empty array when nothing is found or the request fails.
 */
export async function fetchCheapSharkDeals(gameName: string): Promise<CheapSharkDeal[]> {
  if (!gameName) return [];
  try {
    const response = await axios.get<CheapSharkDeal[]>(`${CHEAPSHARK_BASE_URL}/deals`, {
      params: { title: gameName },
      headers: { "User-Agent": CHEAPSHARK_USER_AGENT },
      timeout: 8000,
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}
