import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import axios from "axios";
import type { GameData } from "@gaming-zone/core";
import { getServerApiUrl } from "@/lib/api-config";

export {
  extractSteamAppId,
  parseSpecHtml,
  fetchSteamRequirements,
} from "@gaming-zone/utils";

/**
 * IGDB ids are numeric. `id` arrives straight from the `/games/[id]` path
 * segment, so it is unvalidated user input — and it becomes both an
 * `unstable_cache` key and a `games:details:<id>` tag. Clamping to digits
 * bounds the key space to the size of IGDB's catalogue; unvalidated, every junk
 * segment under /games/ minted a permanent entry that rewrote on every TTL
 * expiry, plus a tag nothing can ever invalidate.
 *
 * Returned null rather than throwing so the page renders its not-found state.
 */
const GAME_ID_PATTERN = /^\d{1,10}$/;

/**
 * Cached per-request so metadata + page rendering share one call, and
 * cross-request via unstable_cache because this drives the IGDB proxy lookup
 * for every game page.
 *
 * TTL is 86400 to match the games/[id] segment `revalidate`. Next derives a
 * route's window from the lowest TTL among the data-cache entries its render
 * touches, so these two must move together. The long TTL is the freshness
 * mechanism; there is no on-demand invalidation of the "games" tag.
 */
export const fetchGameDetails = cache(
  async (rawId: string): Promise<GameData | null> => {
    const id = rawId.trim();

    // Validated before the cache key is built, not inside the inner function —
    // clamping inside would still create the entry for whatever was passed in.
    if (!GAME_ID_PATTERN.test(id)) return null;

    return unstable_cache(
      async () => {
        try {
          const res = await axios.get<GameData>(`${getServerApiUrl()}/game-details`, {
            params: { id },
            timeout: 8000,
          });
          return res.data;
        } catch (error) {
          console.error("Error fetching game details:", error);
          return null;
        }
      },
      ["game-details", id],
      { revalidate: 86400, tags: ["games", `games:details:${id}`] },
    )();
  },
);
