import { useEffect } from "react";
import type { PcRequirements } from "@gaming-zone/core";
import { usePcRequirementsStore } from "@/src/store/usePcRequirementsStore";

export type PcRequirementsState = {
  pcRequirements: PcRequirements | null;
  pcReqLoading: boolean;
};

/**
 * PC requirements for a game, resolved through the shared requirements store
 * (PCGamingWiki by name, Steam fallback — all server-side).
 *
 * Card rails reuse the same store data without a second network call. Games
 * the backend cannot resolve settle to `null` — the section then renders
 * nothing rather than an empty table.
 */
export function useGamePcRequirements(
  gameId?: number | null,
): PcRequirementsState {
  const request = usePcRequirementsStore((state) => state.request);
  const entry = usePcRequirementsStore((state) =>
    gameId == null ? undefined : state.byGameId[gameId],
  );

  useEffect(() => {
    if (gameId == null) return;
    request(gameId);
  }, [gameId, request]);

  return {
    pcRequirements: entry?.requirements ?? null,
    // Until the store has a settled entry for this game the backend may still
    // resolve requirements for it, so the skeleton stays up.
    pcReqLoading: gameId != null && (entry === undefined || entry.status === "loading"),
  };
}
