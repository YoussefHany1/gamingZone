/**
 * Estimates how a game's Steam requirements compare with the user's PC.
 *
 * A card only has to call this hook: requirements are requested through the
 * shared store (which batches/debounces), and a future release is filtered out
 * before anything is fetched or rendered.
 */
import { useEffect, useMemo } from "react";
import type { PcCompatibility, PcRequirements } from "@gaming-zone/core";
import { estimatePcCompatibility } from "@gaming-zone/utils";
import { usePcSpecsStore } from "@/src/store/usePcSpecsStore";
import { usePcRequirementsStore } from "@/src/store/usePcRequirementsStore";

/**
 * True for a released game. Unknown dates are treated as released — the
 * requirements lookup is the filter that matters for those older payloads.
 */
export function isGameReleased(firstReleaseDate?: number | null): boolean {
  if (firstReleaseDate == null || !Number.isFinite(firstReleaseDate)) return true;
  return firstReleaseDate * 1000 <= Date.now();
}

export function usePcRequirements(
  gameId: number | null | undefined,
  options?: { enabled?: boolean },
): PcRequirements | null {
  const enabled = options?.enabled ?? true;
  const request = usePcRequirementsStore((state) => state.request);
  const entry = usePcRequirementsStore((state) =>
    gameId == null ? undefined : state.byGameId[gameId],
  );

  useEffect(() => {
    if (!enabled || gameId == null) return;
    request(gameId);
  }, [enabled, gameId, request]);

  return entry?.requirements ?? null;
}

/**
 * @param requirementsOverride When supplied, skip the shared lookup and score
 *   these rows directly (the details screen already fetched them).
 */
export function usePcCompatibility(
  gameId: number | null | undefined,
  firstReleaseDate?: number | null,
  requirementsOverride?: PcRequirements | null,
): PcCompatibility | null {
  const specs = usePcSpecsStore((state) => state.specs);
  const request = usePcRequirementsStore((state) => state.request);
  const entry = usePcRequirementsStore((state) =>
    gameId == null ? undefined : state.byGameId[gameId],
  );

  const released = isGameReleased(firstReleaseDate);

  useEffect(() => {
    if (!specs || !released || gameId == null) return;
    if (requirementsOverride !== undefined) return;
    request(gameId);
  }, [specs, released, gameId, requirementsOverride, request]);

  const requirements =
    requirementsOverride !== undefined
      ? requirementsOverride
      : (entry?.requirements ?? null);

  return useMemo(() => {
    if (!specs || !released || !requirements) return null;
    return estimatePcCompatibility(specs, requirements);
  }, [specs, released, requirements]);
}
