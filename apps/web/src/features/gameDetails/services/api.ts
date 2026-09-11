import axios from "axios";
import type { GameData } from "@gaming-zone/core";

export {
  extractSteamAppId,
  parseSpecHtml,
  fetchSteamRequirements,
} from "@gaming-zone/utils";

const SERVER_URL = "https://gamingzone-api.onrender.com";

export async function fetchGameDetails(id: string): Promise<GameData | null> {
  try {
    const baseUrl = SERVER_URL.endsWith('/') ? SERVER_URL.slice(0, -1) : SERVER_URL;
    const res = await axios.get<GameData>(`${baseUrl}/game-details`, {
      params: { id },
      timeout: 8000,
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
}
