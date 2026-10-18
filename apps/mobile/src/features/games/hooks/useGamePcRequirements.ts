import { useEffect, useState } from "react";
import {
  extractSteamAppId,
  fetchSteamRequirements,
} from "../components/gameDetails/utils";
import type { PcRequirements, Website } from "../types";

export type PcRequirementsState = {
  pcRequirements: PcRequirements | null;
  pcReqLoading: boolean;
};

/**
 * Steam's PC system requirements for a game, resolved from its Steam store page.
 *
 * Games with no Steam link resolve to `null` immediately — the section then
 * renders nothing rather than an empty table.
 */
export function useGamePcRequirements(
  websites: Website[] | undefined,
): PcRequirementsState {
  const [pcRequirements, setPcRequirements] = useState<PcRequirements | null>(null);
  const [pcReqLoading, setPcReqLoading] = useState<boolean>(false);

  useEffect(() => {
    setPcRequirements(null);
    // Clear any stale loading flag left by a previous game that *did* have a
    // Steam link; without this the next Steam-less game keeps its skeleton
    // forever (known-gaps §3, fixed rather than deferred).
    setPcReqLoading(false);

    const appId = extractSteamAppId(websites);
    if (!appId) return;

    let cancelled = false;
    setPcReqLoading(true);

    fetchSteamRequirements(appId).then((result) => {
      if (!cancelled) {
        setPcRequirements(result);
        setPcReqLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [websites]);

  return { pcRequirements, pcReqLoading };
}
