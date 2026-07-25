/**
 * IGDB / GamingZone Backend API endpoints.
 *
 * All calls to the GamingZone backend (which proxies IGDB) are centralised
 * here.  Import these functions in your hooks/components instead of calling
 * axios directly.
 */
import type { Game, GamingEvent } from "@/src/types/sharedTypes";
import type { GameData, GameFilters } from "@/src/features/games/types";
import apiClient from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchParams {
  query?: string;
  filters?: GameFilters;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** Fetch the full detail for a single game by IGDB ID. */
export async function fetchGameById(id: number | string): Promise<GameData> {
  if (!id) throw new Error("fetchGameById: id is required");
  const response = await apiClient.get<GameData>("/game-details", {
    params: { id },
  });
  return response.data;
}

/** Fetch currently popular games. */
export async function fetchPopularGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/popular");
  return response.data;
}

/** Fetch games with upcoming release dates (coming soon). */
export async function fetchComingSoonGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/coming-soon");
  return response.data;
}

/** Fetch recently released games. */
export async function fetchRecentlyReleasedGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/recently-released");
  return response.data;
}

/** Fetch top-rated games of all time. */
export async function fetchTopRatedGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/top-rated");
  return response.data;
}

/** Fetch top sellers on Steam. */
export async function fetchSteamTopSellerGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/steam-top-sellers");
  return response.data;
}

/** Fetch most anticipated upcoming games. */
export async function fetchMostAnticipatedGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/most-anticipated");
  return response.data;
}

/** Fetch trending mobile games. */
export async function fetchTrendingMobileGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/trending-mobile");
  return response.data;
}

/** Fetch nostalgia-corner classic games. */
export async function fetchNostalgiaGames(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/nostalgia-corner");
  return response.data;
}

/** Fetch latest trailers for the home slideshow. */
export async function fetchLatestTrailers(): Promise<Game[]> {
  const response = await apiClient.get<Game[]>("/latest-trailers");
  return response.data;
}

/** Fetch upcoming gaming events. */
export async function fetchGamingEvents(): Promise<GamingEvent[]> {
  const response = await apiClient.get<GamingEvent[]>("/events");
  return response.data;
}

/** Search games by query text and optional filters. */
export async function searchGames({ query, filters }: SearchParams): Promise<Game[]> {
  const params: Record<string, string> = {};
  if (query) params.q = query;
  if (filters?.year) params.year = filters.year;
  if (filters?.genre) params.genre = filters.genre;
  if (filters?.platform) params.platform = filters.platform;
  if (filters?.sort) params.sort = filters.sort;

  const response = await apiClient.get<Game[]>("/search", { params });
  return response.data;
}
