/**
 * GOG.com price lookup via the public catalog API.
 *
 * GOG exposes a keyless catalog endpoint, so this lookup runs client-side
 * (same trust model as CheapShark). Prices are fetched at runtime and are
 * never persisted — they live only in component state.
 */
import axios from "axios";
import { normalizeGameTitle } from "@gaming-zone/utils";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GogMoney {
  amount?: string | number;
  currency?: string;
}

interface GogProduct {
  id: string;
  title: string;
  slug?: string;
  /** Absolute URL of the product page on gog.com. */
  storeLink?: string;
  price?: {
    finalMoney?: GogMoney;
    baseMoney?: GogMoney;
  };
}

interface GogCatalogResponse {
  products?: GogProduct[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website type ID for GOG. */
const GOG_IGDB_TYPE = 17;

const GOG_CATALOG_URL = "https://catalog.gog.com/v1/catalog";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseAmount(raw: string | number | undefined): number | null {
  if (raw == null || raw === "") return null;
  const value = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Ranks catalog hits against the game title: exact normalised title beats a
 * title prefix, which beats "every significant word present".
 */
function pickBestProduct(gameName: string, products: GogProduct[]): GogProduct | null {
  if (!products.length) return null;

  const normalized = normalizeGameTitle(gameName);

  const exact = products.find((p) => normalizeGameTitle(p.title) === normalized);
  if (exact) return exact;

  const startsWith = products.find((p) => normalizeGameTitle(p.title).startsWith(normalized));
  if (startsWith) return startsWith;

  const words = normalized.split(" ").filter((w) => w.length > 2);
  if (words.length) {
    const wordMatch = products.find((p) => {
      const title = normalizeGameTitle(p.title);
      return words.every((w) => title.includes(w));
    });
    if (wordMatch) return wordMatch;
  }

  return products[0] ?? null;
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the current GOG price for a game by title.
 *
 * Returns `StorePrice` keyed to IGDB type 17 (GOG), or `null` when GOG has
 * no matching product, prices it in a currency other than USD, or the
 * lookup fails.
 */
export async function fetchGogPrice(
  gameName: string,
  websites: Website[] | undefined,
): Promise<StorePrice | null> {
  if (!gameName) return null;

  try {
    const response = await axios.get<GogCatalogResponse>(GOG_CATALOG_URL, {
      params: {
        query: `like:${gameName}`,
        limit: 5,
        productType: "in:game",
        locale: "en-US",
      },
      timeout: 8000,
    });

    const best = pickBestProduct(gameName, response.data?.products ?? []);
    if (!best?.price) return null;

    const salePrice = parseAmount(best.price.finalMoney?.amount);
    if (salePrice === null) return null;

    // The row renders "$" — refuse results the locale didn't pin to USD.
    if (best.price.finalMoney?.currency && best.price.finalMoney.currency !== "USD") {
      return null;
    }

    const normalPrice = parseAmount(best.price.baseMoney?.amount) ?? salePrice;

    const gogWebsite = websites?.find((w) => w.type === GOG_IGDB_TYPE);

    return {
      type: GOG_IGDB_TYPE,
      salePrice,
      normalPrice,
      isOnSale: normalPrice > salePrice,
      url:
        best.storeLink ??
        gogWebsite?.url ??
        (best.slug || best.id ? `https://www.gog.com/en/game/${best.slug ?? best.id}` : null) ??
        "https://www.gog.com/",
    };
  } catch {
    return null;
  }
}
