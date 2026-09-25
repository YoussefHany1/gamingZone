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
 * Cached per-request so metadata + page rendering share one call, and
 * cross-request via unstable_cache because this drives the IGDB proxy lookup
 * for every game page. TTL matches games/[id]'s `revalidate` (3600);
 * /api/revalidate invalidates the tag ahead of that when needed.
 *
 * Key space is bounded — `id` is a numeric IGDB id, not user-supplied text —
 * so unlike searchGames this is safe to cache.
 */
export const fetchGameDetails = cache(
  async (id: string): Promise<GameData | null> =>
    unstable_cache(
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
      { revalidate: 3600, tags: ["games", `games:details:${id}`] },
    )(),
);
