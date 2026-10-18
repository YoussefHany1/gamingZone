/**
 * Epic Games Store price lookup via the public catalog GraphQL API.
 *
 * Epic's store GraphQL endpoint is keyless, so this lookup runs client-side
 * (same trust model as CheapShark / GOG). Prices are fetched at runtime and
 * are never persisted — they live only in component state.
 */
import axios from "axios";
import { normalizeGameTitle } from "@gaming-zone/utils";
import type { StorePrice, Website } from "@/src/features/games/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EpicTotalPrice {
  /** Current price in cents (0 = free). */
  discountPrice?: number;
  /** Pre-discount price in cents. */
  originalPrice?: number;
  currencyCode?: string;
}

interface EpicElement {
  title?: string;
  productId?: string;
  productSlug?: string;
  productType?: string;
  catalogNs?: { mappings?: Array<{ pageSlug?: string | null }> | null } | null;
  offerMappings?: Array<{ pageSlug?: string | null }> | null;
  price?: { totalPrice?: EpicTotalPrice | null } | null;
}

interface EpicSearchResponse {
  data?: {
    Catalog?: {
      searchStore?: { elements?: EpicElement[] | null } | null;
    } | null;
  } | null;
  errors?: Array<{ message?: string }>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website type ID for the Epic Games Store. */
const EPIC_IGDB_TYPE = 16;

const EPIC_GRAPHQL_URL = "https://store.epicgames.com/graphql";

/**
 * Minimal projection of Epic's `searchStore` query — only the fields the
 * price tile needs. Base-game editions are tried first, then any game.
 */
const SEARCH_QUERY = `
  query searchStoreQuery($keywords: String, $category: String, $count: Int, $start: Int, $country: String!, $locale: String) {
    Catalog {
      searchStore(keywords: $keywords, category: $category, count: $count, start: $start, country: $country, locale: $locale) {
        elements {
          title
          productSlug
          catalogNs { mappings { pageSlug } }
          offerMappings { pageSlug }
          price(country: $country) {
            totalPrice { discountPrice originalPrice currencyCode }
          }
        }
      }
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Runs one catalog search; returns the raw elements (possibly empty). */
async function searchEpicCatalog(keywords: string, category: string): Promise<EpicElement[]> {
  const response = await axios.post<EpicSearchResponse>(
    EPIC_GRAPHQL_URL,
    {
      query: SEARCH_QUERY,
      variables: {
        keywords,
        category,
        count: 10,
        start: 0,
        country: "US",
        locale: "en-US",
      },
    },
    {
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      timeout: 8000,
    },
  );
  return response.data?.data?.Catalog?.searchStore?.elements ?? [];
}

/**
 * Ranks catalog hits against the game title: exact normalised titles first,
 * then title prefixes, then "every significant word present". Candidates
 * that match nothing are discarded — a wrong price is worse than no price.
 */
function rankElements(gameName: string, elements: EpicElement[]): EpicElement[] {
  const normalized = normalizeGameTitle(gameName);
  const withTitles = elements.filter((e) => e.title);

  const isExact = (e: EpicElement) => normalizeGameTitle(e.title!) === normalized;
  const exact = withTitles.filter(isExact);

  const prefix = withTitles.filter((e) => {
    if (isExact(e)) return false;
    const title = normalizeGameTitle(e.title!);
    return title.startsWith(normalized) || normalized.startsWith(title);
  });

  const words = normalized.split(" ").filter((w) => w.length > 2);
  const wordMatch = words.length
    ? withTitles.filter((e) => {
        if (isExact(e)) return false;
        const title = normalizeGameTitle(e.title!);
        return !title.startsWith(normalized) && words.every((w) => title.includes(w));
      })
    : [];

  return [...exact, ...prefix, ...wordMatch];
}

/** Best store-page slug for an element: offer mapping, catalog mapping, then productSlug. */
function extractPageSlug(element: EpicElement): string | null {
  return (
    element.offerMappings?.find((m) => m.pageSlug)?.pageSlug ??
    element.catalogNs?.mappings?.find((m) => m.pageSlug)?.pageSlug ??
    element.productSlug ??
    null
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the current USD price for a game on the Epic Games Store.
 *
 * Returns `StorePrice` keyed to IGDB type 16 (Epic), or `null` when Epic
 * has no matching base game, prices in another currency, or the lookup
 * fails.
 */
export async function fetchEpicPrice(
  gameName: string,
  websites: Website[] | undefined,
): Promise<StorePrice | null> {
  if (!gameName) return null;

  try {
    let elements = await searchEpicCatalog(gameName, "games/edition/base");
    if (!elements.length) {
      // Base-edition category can miss remasters/bundles; widen once.
      elements = await searchEpicCatalog(gameName, "games");
    }

    const normalized = normalizeGameTitle(gameName);

    for (const element of rankElements(gameName, elements)) {
      const totalPrice = element.price?.totalPrice;
      if (typeof totalPrice?.discountPrice !== "number") continue;
      // The row renders "$" — refuse results the locale didn't pin to USD.
      if (totalPrice.currencyCode && totalPrice.currencyCode !== "USD") continue;

      const salePrice = totalPrice.discountPrice / 100;
      // "Free" only when the store says *this exact title* is free — a
      // fuzzy match's $0 is far more likely a demo or unrelated app.
      if (salePrice === 0 && normalizeGameTitle(element.title ?? "") !== normalized) {
        continue;
      }

      const normalPrice =
        typeof totalPrice.originalPrice === "number"
          ? totalPrice.originalPrice / 100
          : salePrice;

      const pageSlug = extractPageSlug(element);
      const epicWebsite = websites?.find((w) => w.type === EPIC_IGDB_TYPE);

      return {
        type: EPIC_IGDB_TYPE,
        salePrice,
        normalPrice,
        isOnSale: normalPrice > salePrice,
        url: pageSlug
          ? `https://store.epicgames.com/en-US/p/${pageSlug}`
          : epicWebsite?.url ??
            `https://store.epicgames.com/en-US/search?q=${encodeURIComponent(gameName)}`,
      };
    }

    return null;
  } catch {
    return null;
  }
}
