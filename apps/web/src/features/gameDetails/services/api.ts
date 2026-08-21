import axios from "axios";
import type { GameData } from "@gaming-zone/core";

export {
  extractSteamAppId,
  parseSpecHtml,
  fetchSteamRequirements,
} from "@gaming-zone/utils";

const SERVER_URL = "https://igdb-api-omega.vercel.app";

export async function fetchGameDetails(id: string): Promise<GameData | null> {
  try {
    const res = await axios.get<GameData>(`${SERVER_URL}/game-details`, {
      params: { id },
      timeout: 8000,
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
}
