import { cache } from "react";
import axios from "axios";
import type { GameData } from "@gaming-zone/core";
import { getServerApiUrl } from "@/lib/api-config";

export {
  extractSteamAppId,
  parseSpecHtml,
  fetchSteamRequirements,
} from "@gaming-zone/utils";

/** Cached per-request so metadata + page rendering share one call. */
export const fetchGameDetails = cache(
  async (id: string): Promise<GameData | null> => {
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
);
