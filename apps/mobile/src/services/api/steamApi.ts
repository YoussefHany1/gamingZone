/**
 * Steam API endpoints proxied through the GamingZone backend.
 *
 * All Steam-related API calls live here so SteamLinkModal (and any future
 * Steam feature) can import clean, typed functions instead of raw axios calls.
 */
import apiClient from "./client";
import type { SteamGame, IgdbGame, SteamWishlistResponse } from "@/src/features/settings/types";

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
 * Throws on a 403 response (private profile) so callers can handle it.
 */
export async function fetchOwnedGames(steamId: string): Promise<OwnedGamesResponse> {
  const response = await apiClient.get<OwnedGamesResponse>(
    `/steam/owned-games?steamid=${steamId}&_t=${Date.now()}`,
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
