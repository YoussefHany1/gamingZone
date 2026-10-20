/**
 * Steam API endpoints proxied through the GamingZone backend.
 *
 * All Steam-related API calls live here so the platform sync service (and any
 * future Steam feature) can import clean, typed functions instead of raw
 * axios calls.
 */
import apiClient from "./client";
import axios from "axios";
import { SERVER_URL } from "@/src/constants/config";
import type {
  SteamGame,
  IgdbGame,
  SteamWishlistResponse,
} from "@/src/features/settings/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnedGamesResponse {
  games: SteamGame[];
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * Resolves a Steam vanity URL or custom ID to a 64-bit Steam ID.
 * Returns null when the profile cannot be found.
 */
export async function resolveSteamVanityUrl(vanity: string): Promise<string | null> {
  try {
    const response = await apiClient.get<{ steamid?: string }>(
      `/steam/resolve?vanityurl=${encodeURIComponent(vanity)}`,
    );
    return response.data.steamid ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches the list of games owned by a Steam user.
 * Throws an error with `.status === 403` on a private profile so callers can
 * handle it (the shared axios client flattens statuses, so this uses a direct
 * request to keep the status intact).
 */
export async function fetchOwnedGames(steamId: string): Promise<OwnedGamesResponse> {
  const response = await axios.get<OwnedGamesResponse>(
    `${SERVER_URL}/steam/owned-games?steamid=${steamId}&_t=${Date.now()}`,
  );
  return response.data;
}

/**
 * Maps an array of Steam App IDs to IGDB game records via the backend.
 */
export async function mapSteamAppsToIgdb(appIds: number[]): Promise<IgdbGame[]> {
  const response = await apiClient.post<IgdbGame[]>("/steam/map-to-igdb", {
    appIds,
  });
  return response.data;
}

/**
 * Fetches the Steam wishlist for a user and returns an array of App IDs.
 */
export async function fetchSteamWishlist(steamId: string): Promise<number[]> {
  try {
    const response = await apiClient.get<SteamWishlistResponse>(
      `/steam/wishlist?steamid=${steamId}&_t=${Date.now()}`,
    );
    return Array.isArray(response.data?.appIds) ? response.data.appIds : [];
  } catch {
    return [];
  }
}
