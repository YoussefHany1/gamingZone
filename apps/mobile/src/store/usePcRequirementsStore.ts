/**
 * Shared, batched Steam-requirements store.
 *
 * Cards do not fetch: they call `request(gameId)` once on mount and read their
 * entry. The store owns the debounce, the 40-id chunks, in-flight dedupe, the
 * MMKV cache and the retry policy, so mounting 200 cards still produces one
 * small set of requests.
 */
import { create } from "zustand";
import type { PcRequirements } from "@gaming-zone/core";
import { storageGet, storageSet } from "@/src/lib/storage";
import {
  PC_REQUIREMENTS_CACHE_KEY,
  isPcRequirementsCacheFresh,
  mergePcRequirementsCache,
  parseRequirementsValue,
  readPcRequirementsCache,
  type PcRequirementsCache,
  type PcRequirementsCacheEntry,
} from "@/src/features/games/lib/pcRequirementsCache";
import { fetchPcRequirementsBatch } from "@/src/services/api/pcRequirementsApi";
import { logger } from "@/src/lib/logger";

/** Cards that mount together are collected into one request after this pause. */
const REQUEST_DEBOUNCE_MS = 300;
/** Per-game retry delay for transient failures (no key in the response). */
const GAME_RETRY_MS = 5 * 60 * 1000;

export type PcRequirementsStatus = "loading" | "ready" | "error";

export type PcRequirementsEntry = {
  requirements: PcRequirements | null;
  status: PcRequirementsStatus;
};

interface PcRequirementsState {
  byGameId: Record<number, PcRequirementsEntry>;
  /** Registers interest in a game; safe to call from every card render. */
  request: (gameId: number) => void;
  /** Stores an already-fetched result (the details screen's Steam lookup). */
  seed: (gameId: number, requirements: PcRequirements | null) => void;
}

// ---------------------------------------------------------------------------
// Module-level scheduling state (not React state: it changes every batch)
// ---------------------------------------------------------------------------

const pendingIds = new Set<number>();
const inFlightIds = new Set<number>();
const retryAfter = new Map<number, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let cache: PcRequirementsCache | null = null;
/**
 * Set when the endpoint answers 404. The route is deployed with the backend,
 * so retrying every rail for the rest of the session only wastes requests.
 */
let endpointDisabled = false;

function readCache(): PcRequirementsCache {
  if (cache) return cache;
  cache = readPcRequirementsCache(storageGet(PC_REQUIREMENTS_CACHE_KEY));
  return cache;
}

function persistCache(next: PcRequirementsCache): void {
  cache = next;
  storageSet(PC_REQUIREMENTS_CACHE_KEY, next);
}

function cacheEntry(gameId: number): PcRequirementsCacheEntry | undefined {
  return readCache()[String(gameId)];
}

function isCached(gameId: number): boolean {
  return isPcRequirementsCacheFresh(cacheEntry(gameId));
}

function setEntries(entries: Record<number, PcRequirementsEntry>): void {
  if (Object.keys(entries).length === 0) return;
  usePcRequirementsStore.setState((state) => ({
    byGameId: { ...state.byGameId, ...entries },
  }));
}

function setReady(gameId: number, requirements: PcRequirements | null): void {
  const existing = usePcRequirementsStore.getState().byGameId[gameId];
  if (
    existing?.status === "ready" &&
    existing.requirements === requirements
  ) {
    return;
  }
  setEntries({ [gameId]: { requirements, status: "ready" } });
}

function setError(gameId: number): void {
  const existing = usePcRequirementsStore.getState().byGameId[gameId];
  // Keep whatever was already on screen; the retry may still succeed.
  if (existing?.status === "ready") return;
  setEntries({ [gameId]: { requirements: null, status: "error" } });
}

function chunksOf<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function fetchChunk(ids: number[]): Promise<void> {
  const loading: Record<number, PcRequirementsEntry> = {};
  for (const id of ids) {
    inFlightIds.add(id);
    const existing = usePcRequirementsStore.getState().byGameId[id];
    // Keep a previously loaded value visible while a stale entry refreshes.
    loading[id] = existing ?? { requirements: null, status: "loading" };
  }
  setEntries(loading);

  try {
    const response = await fetchPcRequirementsBatch(ids);
    const now = Date.now();
    const updates: Array<{ gameId: number; requirements: PcRequirements | null }> = [];
    const entries: Record<number, PcRequirementsEntry> = {};

    for (const id of ids) {
      if (!Object.prototype.hasOwnProperty.call(response, String(id))) {
        // Transient: the backend did not resolve this game this time. Leave
        // the previous value (if any) and try again a few minutes later.
        retryAfter.set(id, now + GAME_RETRY_MS);
        if (!usePcRequirementsStore.getState().byGameId[id]) setError(id);
        continue;
      }

      const requirements = parseRequirementsValue(response[String(id)] ?? null);
      updates.push({ gameId: id, requirements });
      entries[id] = { requirements, status: "ready" };
      retryAfter.delete(id);
    }

    if (updates.length > 0) {
      persistCache(mergePcRequirementsCache(readCache(), updates, now));
    }
    setEntries(entries);
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    if (status === 404) {
      endpointDisabled = true;
      logger.warn("[usePcRequirementsStore] /pc-requirements is not deployed yet");
    } else {
      logger.warn("[usePcRequirementsStore] Batch request failed:", error);
    }

    const now = Date.now();
    for (const id of ids) {
      retryAfter.set(id, now + GAME_RETRY_MS);
      setError(id);
    }
  } finally {
    for (const id of ids) inFlightIds.delete(id);
  }
}

async function flushPending(): Promise<void> {
  flushTimer = null;

  if (endpointDisabled) {
    pendingIds.clear();
    return;
  }

  const now = Date.now();
  const ids = [...pendingIds].filter((id) => {
    if (isCached(id)) {
      setReady(id, cacheEntry(id)?.requirements ?? null);
      return false;
    }
    if (inFlightIds.has(id)) return false;
    const retryAt = retryAfter.get(id);
    if (retryAt !== undefined && retryAt > now) return false;
    return true;
  });
  pendingIds.clear();

  if (ids.length === 0) return;

  // Sequential chunks: the backend calls Steam once per chunk, so firing every
  // chunk at once only increases the chance of a Steam rate limit.
  for (const chunk of chunksOf(ids, 40)) {
    if (endpointDisabled) break;
    await fetchChunk(chunk);
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    void flushPending();
  }, REQUEST_DEBOUNCE_MS);
}

export const usePcRequirementsStore = create<PcRequirementsState>()((set, get) => ({
  byGameId: {},

  request: (gameId: number) => {
    if (!Number.isInteger(gameId) || gameId <= 0) return;
    if (endpointDisabled) return;

    const existing = get().byGameId[gameId];
    if (existing?.status === "ready" && isCached(gameId)) return;

    // A fresh cache entry paints immediately without waiting for the debounce.
    if (isCached(gameId)) {
      setReady(gameId, cacheEntry(gameId)?.requirements ?? null);
      return;
    }

    if (inFlightIds.has(gameId)) return;
    const retryAt = retryAfter.get(gameId);
    if (retryAt !== undefined && retryAt > Date.now()) return;

    pendingIds.add(gameId);
    scheduleFlush();
  },

  seed: (gameId: number, requirements: PcRequirements | null) => {
    if (!Number.isInteger(gameId) || gameId <= 0) return;

    // Do not let a "no Steam page" seed erase requirements another source
    // already resolved for the same game.
    if (requirements === null) {
      const current = cacheEntry(gameId);
      if (isPcRequirementsCacheFresh(current) && current?.requirements) {
        setReady(gameId, current.requirements);
        return;
      }
    }

    const now = Date.now();
    persistCache(mergePcRequirementsCache(readCache(), [{ gameId, requirements }], now));
    retryAfter.delete(gameId);
    pendingIds.delete(gameId);
    setReady(gameId, requirements);
  },
}));
