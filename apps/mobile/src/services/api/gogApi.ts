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

/** Titles that aren't the base game — never chosen by fuzzy matches. */
const NON_GAME_TITLE = /(demo|sound ?track|bonus|dlc|expansion|artbook|wallpaper|converter)/;

/**
 * Ranks catalog hits against the game title: exact normalised titles first,
 * then title prefixes, then "every significant word present". Demos,
 * soundtracks and other non-game entries only ever win an exact match, and
 * entries matching nothing are discarded — a wrong price is worse than none.
 */
function rankProducts(gameName: string, products: GogProduct[]): GogProduct[] {
  if (!products.length) return [];

  const normalized = normalizeGameTitle(gameName);
  const isExact = (p: GogProduct) => normalizeGameTitle(p.title) === normalized;

  const exact = products.filter(isExact);
  const rest = products.filter(
    (p) => !isExact(p) && !NON_GAME_TITLE.test(p.title.toLowerCase()),
  );

  const startsWith = rest.filter((p) => {
    const title = normalizeGameTitle(p.title);
    return title.startsWith(normalized) || normalized.startsWith(title);
  });

  const words = normalized.split(" ").filter((w) => w.length > 2);
  const wordMatch = words.length
    ? rest.filter((p) => {
        if (startsWith.includes(p)) return false;
        const title = normalizeGameTitle(p.title);
        return words.every((w) => title.includes(w));
      })
    : [];

  return [...exact, ...startsWith, ...wordMatch];
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

    const normalized = normalizeGameTitle(gameName);

    for (const best of rankProducts(gameName, response.data?.products ?? [])) {
      if (!best.price) continue;

      const salePrice = parseAmount(best.price.finalMoney?.amount);
      if (salePrice === null) continue;

      // The row renders "$" — refuse results the locale didn't pin to USD.
      if (best.price.finalMoney?.currency && best.price.finalMoney.currency !== "USD") {
        continue;
      }
      // "Free" only for an exact title match — GOG's fuzzy catalog search
      // happily returns free demos for games it doesn't actually carry.
      if (salePrice === 0 && normalizeGameTitle(best.title) !== normalized) {
        continue;
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
    }

    return null;
  } catch {
    return null;
  }
}
