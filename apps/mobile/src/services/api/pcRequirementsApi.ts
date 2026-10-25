/**
 * Batch PC-requirements endpoint (PCGamingWiki primary, Steam fallback).
 *
 * Game-card rails only know an IGDB id, so the backend resolves requirements
 * server-side — PCGamingWiki by game name, with a Steam `appdetails` fallback —
 * and returns structured `{ label, value }` rows for both tiers. The rows feed
 * the shared compatibility scorer on mobile and web unchanged.
 */
import type { SpecRow } from "@gaming-zone/core";
import apiClient from "./client";

/** One game's requirement tiers, or null when there are none. */
export type PcRequirementsResponseValue =
  | { minimum: SpecRow[] | null; recommended: SpecRow[] | null; rtMinimum?: SpecRow[] | null; rtUltra?: SpecRow[] | null }
  | null;

/** IGDB id → requirement tiers. A missing key means "retry later". */
export type PcRequirementsResponse = Record<string, PcRequirementsResponseValue>;

/** Matches the backend's per-request cap. */
export const PC_REQUIREMENTS_BATCH_SIZE = 40;

/**
 * Fetches requirement rows for up to {@link PC_REQUIREMENTS_BATCH_SIZE} IGDB
 * games. Rejects on transport/server failure so the caller can back off.
 */
export async function fetchPcRequirementsBatch(
  gameIds: readonly number[],
): Promise<PcRequirementsResponse> {
  if (gameIds.length === 0) return {};

  const ids = gameIds.slice(0, PC_REQUIREMENTS_BATCH_SIZE).join(",");
  const response = await apiClient.get<PcRequirementsResponse>("/pc-requirements", {
    params: { ids },
    // The backend walks PCGamingWiki serially (its 60 req/min limit), so a
    // large first batch can legitimately take longer than the client default.
    timeout: 15_000,
  });

  const data: unknown = response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    // A proxy or the "unknown route" redirect answered with HTML: treating it
    // as an empty result would cache "no requirements" for real games.
    throw new Error("Unexpected /pc-requirements response");
  }

  return data as PcRequirementsResponse;
}
