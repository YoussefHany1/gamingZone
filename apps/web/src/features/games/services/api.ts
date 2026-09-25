import axios from "axios";
import { Game } from "../types";
import { getServerApiUrl } from "@/lib/api-config";

/**
 * Client-callable game search.
 *
 * This module is imported by the GameSearchAutocomplete client component, so it
 * must stay free of `server-only` and of `unstable_cache` — both would pull
 * server-only code into the browser bundle. The cached, server-side list
 * accessors live in ./server-cache.
 */
export async function searchGames(
  query: string,
  genre: string,
  platform: string,
  sort: string,
  page: number = 1,
): Promise<Game[]> {
  try {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (page) params.page = page.toString();

    // Map short names to IGDB exact names
    const genreMap: Record<string, string> = {
      rpg: "Role-playing (RPG)",
      shooter: "Shooter",
      fighting: "Fighting",
      racing: "Racing",
      strategy: "Strategy",
      adventure: "Adventure",
      indie: "Indie",
    };

    const platformMap: Record<string, string> = {
      pc: "PC (Microsoft Windows)",
      ps5: "PlayStation 5",
      xboxSeries: "Xbox Series X|S",
      switch: "Nintendo Switch",
    };

    if (genre) params.genre = genreMap[genre] || genre;
    if (platform) params.platform = platformMap[platform] || platform;
    if (sort) params.sort = sort;

    const res = await axios.get<Game[]>(`${getServerApiUrl()}/search`, {
      params,
      timeout: 10000,
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error searching games:", error);
    return [];
  }
}
