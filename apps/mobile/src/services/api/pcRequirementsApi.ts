/**
 * Batch Steam PC-requirements endpoint.
 *
 * Game-card rails only know an IGDB id, so the backend resolves each game's
 * Steam app id and fetches all requirements in one Steam call. The raw HTML is
 * parsed on the client by the shared `@gaming-zone/utils` parser, keeping the
 * scoring rules identical between mobile and web.
 */
import type { PcRequirements } from "@gaming-zone/core";
import apiClient from "./client";

/** One game's raw Steam requirement tiers, or null when there are none. */
export type PcRequirementsResponseValue =
  | { minimum: string | null; recommended: string | null }
  | null;

/** IGDB id → requirement tiers. A missing key means "retry later". */
export type PcRequirementsResponse = Record<string, PcRequirementsResponseValue>;

/** Matches the backend's per-request cap. */
export const PC_REQUIREMENTS_BATCH_SIZE = 40;

/**
 * Fetches Steam requirements for up to {@link PC_REQUIREMENTS_BATCH_SIZE} IGDB
 * games. Rejects on transport/server failure so the caller can back off.
 */
export async function fetchPcRequirementsBatch(
  gameIds: readonly number[],
): Promise<PcRequirementsResponse> {
  if (gameIds.length === 0) return {};

  const ids = gameIds.slice(0, PC_REQUIREMENTS_BATCH_SIZE).join(",");
  const response = await apiClient.get<PcRequirementsResponse>("/pc-requirements", {
    params: { ids },
  });

  const data: unknown = response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    // A proxy or the "unknown route" redirect answered with HTML: treating it
    // as an empty result would cache "no requirements" for real games.
    throw new Error("Unexpected /pc-requirements response");
  }

  return data as PcRequirementsResponse;
}

/** Local alias kept for readability at call sites. */
export type PcRequirementsValue = PcRequirements | null;
