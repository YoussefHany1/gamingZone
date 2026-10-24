import { useEffect, useState } from "react";
import {
  extractSteamAppId,
  fetchSteamRequirements,
} from "../components/gameDetails/utils";
import type { PcRequirements, Website } from "../types";
import { usePcRequirementsStore } from "@/src/store/usePcRequirementsStore";

export type PcRequirementsState = {
  pcRequirements: PcRequirements | null;
  pcReqLoading: boolean;
};

/**
 * Steam's PC system requirements for a game, resolved from its Steam store page.
 *
 * Seeds the shared requirements store so card-level compatibility can reuse
 * the same data without a second network call. Games with no Steam link
 * resolve to `null` immediately — the section then renders nothing rather than
 * an empty table.
 */
export function useGamePcRequirements(
  websites: Website[] | undefined,
  gameId?: number | null,
): PcRequirementsState {
  const seed = usePcRequirementsStore((state) => state.seed);
  const [pcRequirements, setPcRequirements] = useState<PcRequirements | null>(null);
  const [pcReqLoading, setPcReqLoading] = useState<boolean>(false);

  useEffect(() => {
    setPcRequirements(null);
    // Clear any stale loading flag left by a previous game that *did* have a
    // Steam link; without this the next Steam-less game keeps its skeleton
    // forever.
    setPcReqLoading(false);

    const appId = extractSteamAppId(websites);
    if (!appId) {
      if (gameId != null) seed(gameId, null);
      return;
    }

    let cancelled = false;
    setPcReqLoading(true);

    fetchSteamRequirements(appId)
      .then((result) => {
        if (cancelled) return;
        setPcRequirements(result);
        if (gameId != null) seed(gameId, result);
      })
      .catch(() => {
        if (cancelled) return;
        if (gameId != null) seed(gameId, null);
      })
      .finally(() => {
        if (cancelled) return;
        setPcReqLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [websites, gameId, seed]);

  return { pcRequirements, pcReqLoading };
}
