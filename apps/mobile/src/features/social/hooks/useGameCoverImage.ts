import { useEffect, useState } from "react";
import { fetchGamesByIds } from "@/src/services/api/igdbApi";
import { logger } from "@/src/lib/logger";

/**
 * useGameCoverImage — resolves the IGDB cover image id for a session's game.
 *
 * Sessions only persist `gameId`/`gameName`, so the cover is looked up on the
 * fly instead of being denormalised into every playSession doc. A module-level
 * id→cover cache makes the whole session list resolve once per install:
 * N cards for the same game share a single `/games` call, and failed lookups
 * are cached as `null` so cards fall back to the initials tile instantly and
 * never refetch for a game that has no cover.
 */
const coverCache = new Map<string, string | null>();

export function useGameCoverImage(
  gameId: string | number | null | undefined,
): string | null {
  const key = gameId == null || gameId === "" ? "" : String(gameId);
  const [coverId, setCoverId] = useState<string | null>(() =>
    key ? (coverCache.get(key) ?? null) : null,
  );

  useEffect(() => {
    if (!key) {
      setCoverId(null);
      return undefined;
    }

    const cached = coverCache.get(key);
    if (cached !== undefined) {
      setCoverId(cached);
      return undefined;
    }

    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const [game] = await fetchGamesByIds([key]);
        const resolved = game?.cover?.image_id ?? null;
        coverCache.set(key, resolved);
        if (!cancelled) setCoverId(resolved);
      } catch (error) {
        logger.warn("[social] Game cover lookup failed:", error);
        coverCache.set(key, null);
        if (!cancelled) setCoverId(null);
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [key]);

  return coverId;
}
