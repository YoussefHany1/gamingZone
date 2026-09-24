import axios from "axios";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Game, FreeGame } from "../types";
import { getServerApiUrl } from "@/lib/api-config";

const FREE_GAMES_LIMIT = 20;

interface FreeGameDoc {
  $id: string;
  title: string;
  image?: string;
  store?: string;
  url?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchGamesList(endpoint: string): Promise<Game[]> {
  try {
    const res = await axios.get<Game[]>(`${getServerApiUrl()}/${endpoint}`, {
      timeout: 8000,
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return [];
  }
}

export async function fetchFreeGames(): Promise<FreeGame[]> {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    if (!DATABASE_ID) return [];

    const res = await databases.listDocuments(
      DATABASE_ID,
      "free_games",
      [Query.orderAsc("type"), Query.limit(FREE_GAMES_LIMIT)],
    );

    return (res.documents as unknown as FreeGameDoc[]).map((doc) => ({
      id: doc.$id,
      title: doc.title,
      image: doc.image,
      store: doc.store,
      url: doc.url,
      type: doc.type ?? "",
      startDate: doc.startDate,
      endDate: doc.endDate,
    }));
  } catch (error) {
    console.error("Error fetching free games from Appwrite:", error);
    return [];
  }
}

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

