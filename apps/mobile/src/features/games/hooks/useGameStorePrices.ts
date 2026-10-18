import { useEffect, useState } from "react";
import { buildStorePrices, fetchCheapSharkDeals } from "@/src/services/api/cheapSharkApi";
import { fetchPsnPrice } from "@/src/services/api/psnApi";
import { logger } from "@/src/lib/logger";
import type { StorePrice, Website } from "../types";

export type StorePricesState = {
  storePrices: StorePrice[] | null;
  storePricesLoading: boolean;
};

/**
 * Current prices for the game, looked up by title across PC stores (CheapShark)
 * and the PlayStation Store in a single parallel round-trip.
 *
 * On failure (either lookup rejects) the loading flag is still cleared and the
 * error is routed to the logger — a Crashlytics non-fatal in release builds —
 * so the section renders "no prices" instead of hanging on its skeleton
 * (known-gaps §2, fixed rather than deferred).
 */
export function useGameStorePrices(
  gameName: string | undefined,
  websites: Website[] | undefined,
): StorePricesState {
  const [storePrices, setStorePrices] = useState<StorePrice[] | null>(null);
  const [storePricesLoading, setStorePricesLoading] = useState<boolean>(false);

  useEffect(() => {
    setStorePrices(null);
    if (!gameName) return;

    let cancelled = false;
    setStorePricesLoading(true);

    // Run CheapShark (PC stores) and PSN in parallel
    Promise.all([
      fetchCheapSharkDeals(gameName),
      fetchPsnPrice(gameName, websites),
    ]).then(([deals, psnPrice]) => {
      if (!cancelled) {
        const pcPrices = buildStorePrices(gameName, websites, deals);
        setStorePrices(psnPrice ? [...pcPrices, psnPrice] : pcPrices);
        setStorePricesLoading(false);
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        // Either lookup rejecting used to leave the skeleton up forever
        // (known-gaps §2). Clear the flag so the section settles, and
        // surface the failure as a logger non-fatal instead of nothing.
        logger.error("Failed to load store prices", error);
        setStorePricesLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameName, websites]);

  return { storePrices, storePricesLoading };
}
