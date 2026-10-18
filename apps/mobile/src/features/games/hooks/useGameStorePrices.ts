import { useEffect, useRef, useState } from "react";
import { buildStorePrices, fetchCheapSharkDeals } from "@/src/services/api/cheapSharkApi";
import { fetchPsnPrice } from "@/src/services/api/psnApi";
import { fetchSteamPrice } from "@/src/services/api/steamPriceApi";
import { fetchEpicPrice } from "@/src/services/api/epicApi";
import { fetchGogPrice } from "@/src/services/api/gogApi";
import { fetchXboxPrice } from "@/src/services/api/xboxApi";
import { fetchNintendoPrice } from "@/src/services/api/nintendoApi";
import { logger } from "@/src/lib/logger";
import type { StorePrice, Website } from "../types";

// ─── Constants ─────────────────────────────────────────────────────────────────

/** IGDB website types looked up for live prices. */
const STORE_TYPES = [13, 16, 17, 22, 23, 24] as const;

/**
 * Relative trust of each lookup when two sources report the same store:
 * dedicated per-store APIs beat CheapShark's aggregates.
 */
const PRICE_PRIORITY = { CHEAPSHARK: 1, DIRECT: 3 } as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

type PriceTask = {
  /** IGDB types this task may fill; cleared from the loading map when it settles. */
  types: readonly number[];
  priority: number;
  run: () => Promise<StorePrice[] | null>;
};

export type StorePricesState = {
  storePrices: StorePrice[] | null;
  /**
   * Per-store loading flags keyed by IGDB website type — a tile shows its
   * spinner while its type is still `true` and no price has arrived yet.
   */
  storePricesLoading: Record<number, boolean>;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Wraps a single-price lookup into the task's array shape. */
const single = (price: StorePrice | null): StorePrice[] => (price ? [price] : []);

function initialLoading(): Record<number, boolean> {
  return Object.fromEntries(STORE_TYPES.map((type) => [type, true]));
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Current prices for the game, looked up across PC stores (CheapShark,
 * Steam, GOG), the PlayStation Store, the Microsoft Store and the
 * Nintendo eShop.
 *
 * Every lookup is an independent task: one store timing out no longer
 * hides the prices that did arrive, and each store tile owns its own
 * loading flag. Failures are routed to the logger — a Crashlytics
 * non-fatal in release builds — so the tile settles into "no price"
 * instead of spinning forever.
 */
export function useGameStorePrices(
  gameName: string | undefined,
  websites: Website[] | undefined,
): StorePricesState {
  const [storePrices, setStorePrices] = useState<StorePrice[] | null>(null);
  const [storePricesLoading, setStorePricesLoading] = useState<Record<number, boolean>>({});
  // One entry per IGDB type; the map (not the array state) is the source of
  // truth so a late CheapShark result can't clobber a fresher dedicated-store
  // price that already landed.
  const pricesByTypeRef = useRef(new Map<number, { price: StorePrice; priority: number }>());

  useEffect(() => {
    pricesByTypeRef.current = new Map();
    setStorePrices(null);

    if (!gameName) {
      setStorePricesLoading({});
      return;
    }

    let cancelled = false;
    setStorePricesLoading(initialLoading());

    const merge = (prices: StorePrice[], priority: number) => {
      const map = pricesByTypeRef.current;
      let changed = false;
      for (const price of prices) {
        const existing = map.get(price.type);
        if (!existing || priority >= existing.priority) {
          map.set(price.type, { price, priority });
          changed = true;
        }
      }
      if (!cancelled && changed) {
        setStorePrices([...map.values()].map((entry) => entry.price));
      }
    };

    const clearLoading = (types: readonly number[]) => {
      if (cancelled) return;
      setStorePricesLoading((prev) => {
        const next = { ...prev };
        for (const type of types) next[type] = false;
        return next;
      });
    };

    const tasks: PriceTask[] = [
      {
        types: [13, 16, 17],
        priority: PRICE_PRIORITY.CHEAPSHARK,
        run: async () => {
          const deals = await fetchCheapSharkDeals(gameName);
          return buildStorePrices(gameName, websites, deals);
        },
      },
      {
        types: [13],
        priority: PRICE_PRIORITY.DIRECT,
        run: async () => single(await fetchSteamPrice(websites)),
      },
      {
        types: [16],
        priority: PRICE_PRIORITY.DIRECT,
        run: async () => single(await fetchEpicPrice(gameName, websites)),
      },
      {
        types: [17],
        priority: PRICE_PRIORITY.DIRECT,
        run: async () => single(await fetchGogPrice(gameName, websites)),
      },
      {
        types: [22],
        priority: PRICE_PRIORITY.DIRECT,
        run: async () => single(await fetchXboxPrice(gameName, websites)),
      },
      {
        types: [23],
        priority: PRICE_PRIORITY.DIRECT,
        run: async () => single(await fetchPsnPrice(gameName, websites)),
      },
      {
        types: [24],
        priority: PRICE_PRIORITY.DIRECT,
        run: async () => single(await fetchNintendoPrice(gameName, websites)),
      },
    ];

    for (const task of tasks) {
      task
        .run()
        .then((prices) => {
          if (prices?.length) merge(prices, task.priority);
        })
        .catch((error: unknown) => {
          // A failing lookup must not hide the others; log it and let the
          // tile settle into "no price".
          logger.error("Failed to load store prices", error);
        })
        .finally(() => {
          clearLoading(task.types);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [gameName, websites]);

  return { storePrices, storePricesLoading };
}
