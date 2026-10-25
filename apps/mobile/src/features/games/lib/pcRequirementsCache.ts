/**
 * Pure cache policy for the shared PC-requirements lookup.
 *
 * Deliberately free of React, MMKV and network imports so the TTL/merge rules
 * can be unit-tested without the native storage module. The requirements store
 * (`usePcRequirementsStore`) owns the read/write and passes plain objects in
 * and out of the helpers below.
 */
import type { PcRequirements, SpecRow } from "@gaming-zone/core";
import type { PcRequirementsResponseValue } from "@/src/services/api/pcRequirementsApi";

/** MMKV key holding the serialised cache. */
export const PC_REQUIREMENTS_CACHE_KEY = "pc_requirements_v1";

/** How long one game's parsed requirements are reused. */
export const PC_REQUIREMENTS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Upper bound on cached games; the oldest entries are evicted first. */
export const PC_REQUIREMENTS_CACHE_LIMIT = 600;

export type PcRequirementsCacheEntry = {
  /** Null means no requirements could be resolved for this game (still cacheable). */
  requirements: PcRequirements | null;
  /** Unix milliseconds. */
  fetchedAt: number;
};

export type PcRequirementsCache = Record<string, PcRequirementsCacheEntry>;

function isSpecRow(value: unknown): value is SpecRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<SpecRow>;
  return typeof row.label === "string" && typeof row.value === "string";
}

function isRequirementRows(value: unknown): value is SpecRow[] {
  return Array.isArray(value) && value.every(isSpecRow);
}

/** Narrows an arbitrary persisted value to a `PcRequirements`. */
export function isPcRequirements(value: unknown): value is PcRequirements {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PcRequirements>;
  return (
    isRequirementRows(candidate.minimum) &&
    isRequirementRows(candidate.recommended) &&
    (candidate.minimum.length > 0 || candidate.recommended.length > 0)
  );
}

/**
 * Validates one backend tier payload into structured rows.
 *
 * The backend already returns parsed `{ label, value }` rows (PCGamingWiki or
 * Steam source); this only narrows them. Returns null when neither tier has
 * any row, so "resolved but nothing to show" is cached as such instead of an
 * empty card.
 */
export function parseRequirementsValue(
  value: PcRequirementsResponseValue,
): PcRequirements | null {
  if (!value) return null;

  const minimum = value.minimum && isRequirementRows(value.minimum) ? value.minimum : [];
  const recommended =
    value.recommended && isRequirementRows(value.recommended) ? value.recommended : [];
  const rtMinimum =
    (value as any).rtMinimum && isRequirementRows((value as any).rtMinimum) ? (value as any).rtMinimum : [];
  const rtUltra =
    (value as any).rtUltra && isRequirementRows((value as any).rtUltra) ? (value as any).rtUltra : [];
  if (minimum.length === 0 && recommended.length === 0 && rtMinimum.length === 0 && rtUltra.length === 0) return null;

  return { minimum, recommended, ...(rtMinimum.length > 0 ? { rtMinimum } : {}), ...(rtUltra.length > 0 ? { rtUltra } : {}) } as PcRequirements;
}

/** True while `entry` is newer than the TTL. */
export function isPcRequirementsCacheFresh(
  entry: PcRequirementsCacheEntry | undefined,
  now: number = Date.now(),
  ttlMs: number = PC_REQUIREMENTS_CACHE_TTL_MS,
): boolean {
  if (!entry) return false;
  return now - entry.fetchedAt < ttlMs;
}

function normalizeEntry(value: unknown): PcRequirementsCacheEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<PcRequirementsCacheEntry>;
  if (typeof entry.fetchedAt !== "number" || !Number.isFinite(entry.fetchedAt)) {
    return null;
  }
  if (entry.requirements !== null && !isPcRequirements(entry.requirements)) {
    return null;
  }

  return {
    requirements: entry.requirements as PcRequirements | null,
    fetchedAt: entry.fetchedAt,
  };
}

/**
 * Drops expired entries and keeps only the newest `limit` entries.
 * Returns a new object; the input is never mutated.
 */
export function prunePcRequirementsCache(
  cache: PcRequirementsCache,
  now: number = Date.now(),
  ttlMs: number = PC_REQUIREMENTS_CACHE_TTL_MS,
  limit: number = PC_REQUIREMENTS_CACHE_LIMIT,
): PcRequirementsCache {
  const fresh = Object.entries(cache).filter(([, entry]) =>
    isPcRequirementsCacheFresh(entry, now, ttlMs),
  );

  fresh.sort(([, a], [, b]) => b.fetchedAt - a.fetchedAt);

  return Object.fromEntries(fresh.slice(0, Math.max(0, limit)));
}

/** Parses the raw MMKV value and prunes it. Invalid entries are discarded. */
export function readPcRequirementsCache(
  raw: unknown,
  now: number = Date.now(),
  ttlMs: number = PC_REQUIREMENTS_CACHE_TTL_MS,
  limit: number = PC_REQUIREMENTS_CACHE_LIMIT,
): PcRequirementsCache {
  let source = raw;
  if (typeof raw === "string") {
    try {
      source = JSON.parse(raw) as unknown;
    } catch {
      return {};
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};

  const parsed: PcRequirementsCache = {};
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    const entry = normalizeEntry(value);
    if (!entry) continue;
    parsed[key] = entry;
  }

  return prunePcRequirementsCache(parsed, now, ttlMs, limit);
}

/**
 * Folds newly fetched requirements into the cache and prunes the result.
 * A game that was fetched again replaces its previous entry.
 */
export function mergePcRequirementsCache(
  cache: PcRequirementsCache,
  updates: Iterable<{ gameId: number; requirements: PcRequirements | null }>,
  now: number = Date.now(),
  limit: number = PC_REQUIREMENTS_CACHE_LIMIT,
): PcRequirementsCache {
  const merged: PcRequirementsCache = { ...cache };

  for (const update of updates) {
    merged[String(update.gameId)] = {
      requirements: update.requirements,
      fetchedAt: now,
    };
  }

  return prunePcRequirementsCache(merged, now, PC_REQUIREMENTS_CACHE_TTL_MS, limit);
}
