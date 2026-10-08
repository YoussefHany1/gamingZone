import { useState, useEffect, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  storageGet,
  storageSet,
  storageGetTimestamp,
  storageSetTimestamp,
} from "../lib/storage";

// ---------------------------------------------------------------------------
// NetInfo cache — shared across all useCachedData instances.
// Avoids redundant network round-trips when multiple hooks trigger
// connectivity checks within a short window (e.g. on initial mount).
// ---------------------------------------------------------------------------
let _netInfoCache: { isConnected: boolean | null; ts: number } | null = null;
const NET_INFO_CACHE_MS = 5_000; // 5 seconds

async function getNetworkStatus(): Promise<{ isConnected: boolean | null }> {
  const now = Date.now();
  if (_netInfoCache && now - _netInfoCache.ts < NET_INFO_CACHE_MS) {
    return _netInfoCache;
  }
  const state = await NetInfo.fetch();
  _netInfoCache = { isConnected: state.isConnected, ts: Date.now() };
  return _netInfoCache;
}

// ---------------------------------------------------------------------------
// Lightweight data-equality check.
// For arrays we compare length + the $id of the first element, which is
// enough to detect new content without serialising the entire payload.
// Falls back to JSON.stringify only for non-array objects.
// ---------------------------------------------------------------------------
function isDataEqual<T>(a: T | null, b: T | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // Compare first-item $id as a fast proxy for "same content".
    const firstA = (a as unknown[])[0] as Record<string, unknown> | undefined;
    const firstB = (b as unknown[])[0] as Record<string, unknown> | undefined;
    if (firstA?.$id !== undefined) return firstA.$id === firstB?.$id;
    return JSON.stringify(a[0]) === JSON.stringify(b[0]);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * useCachedData — MMKV-backed stale-while-revalidate cache.
 *
 * Serves data immediately from the synchronous MMKV store (no awaits, no
 * bridge round-trips), then revalidates in the background when the TTL has
 * expired or forceRefresh is requested.
 *
 * Compared to the AsyncStorage version:
 *  - Cache reads are now synchronous → the UI shows cached data *instantly*
 *    instead of waiting for 2-3 async ticks.
 *  - No async/await overhead for the TTL check.
 *  - Memory usage is lower: MMKV is a C++ memory-mapped file, not a JS heap
 *    string that AsyncStorage re-parses on every access.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
  setData: (newData: T) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unwraps a stored value that may be either a raw T or a {data, timestamp} envelope. */
function unwrapCachedValue<T>(raw: unknown): T {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "data" in (raw as object) &&
    "timestamp" in (raw as object)
  ) {
    return (raw as { data: T; timestamp: number }).data;
  }
  return raw as T;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default function useCachedData<T>(
  /** MMKV key used for persistence. */
  key: string,
  /** Async function that fetches fresh data from the network. */
  fetchFn: () => Promise<T>,
  /** Re-fetch when any of these values change (same semantics as useEffect deps). */
  dependencies: unknown[] = [],
  /** How long (ms) cached data is considered fresh before a background re-fetch. Default: 5 minutes. */
  ttl: number = 300_000,
  /** When false, also skips the automatic load on mount and on key/TTL changes (e.g. a mock-only preview). Default: true. */
  enabled: boolean = true,
): CachedDataResult<T> {
  // ── Seed state synchronously from MMKV ──────────────────────────────────
  // Because storageGet is synchronous, we can read the cached value *before*
  // the first render and pass it to useState as the initial value.  This means
  // the component never renders with null data when a cache entry exists.
  //
  // storageGet is a synchronous JSON.parse of the entire payload, and the Games
  // screen mounts ~9 of these hooks at once, so the cache is read exactly once
  // per key — not once per state field, and not again on every loadData call.
  // Re-reading it in a second useState initialiser used to double the parse cost
  // of every mount.
  const snapshotRef = useRef<{
    key: string;
    data: T | null;
    present: boolean;
  } | null>(null);
  if (snapshotRef.current === null || snapshotRef.current.key !== key) {
    const raw = storageGet<unknown>(key);
    snapshotRef.current = {
      key,
      data: raw !== null ? unwrapCachedValue<T>(raw) : null,
      present: raw !== null,
    };
  }
  const snapshot = snapshotRef.current;

  const [data, setDataState] = useState<T | null>(snapshot.data);

  const [isLoading, setIsLoading] = useState(
    // If we already have cached data we don't need to show a full-page
    // loading spinner — just a background-refetch indicator if the TTL is
    // expired. Derived from the snapshot rather than a second cache read.
    () => !snapshot.present,
  );
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Holds the latest in-memory copy so the Realtime callback and TTL check
  // can read it without triggering re-renders.
  const currentDataRef = useRef<T | null>(snapshot.data);
  // Which key the in-memory copy belongs to. useState does not re-run its
  // initialiser, so after a key change the refs above would otherwise still
  // hold the previous key's payload.
  const currentKeyRef = useRef<string>(key);

  // Stable ref to fetchFn so useCallback deps stay minimal.
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const loadData = useCallback(
    async (forceRefresh = false, signal?: AbortSignal): Promise<void> => {
      const timestampKey = `${key}_timestamp`;

      const safeSet = <S>(setter: (v: S) => void, value: S) => {
        if (!signal?.aborted) setter(value);
      };

      safeSet(setIsRefetching, true);
      safeSet(setError, null);

      try {
        // 1. Serve cached data synchronously.
        //    On the first call the snapshot above already seeded state, but on a
        //    later key change these refs still hold the *previous* key's payload.
        //    The guard therefore has to compare keys, not just test for
        //    emptiness — otherwise a key change silently keeps serving the old
        //    key's data (and its TTL) and can return early without fetching.
        if (currentKeyRef.current !== key || currentDataRef.current == null) {
          currentDataRef.current = snapshot.data;
          currentKeyRef.current = key;
          safeSet(setDataState, snapshot.data);
          if (snapshot.present) safeSet(setIsLoading, false);
        }

        // 2. Respect TTL — skip the network call if the cache is still fresh.
        if (!forceRefresh) {
          const ts = storageGetTimestamp(timestampKey); // synchronous, no await
          if (ts !== null && currentDataRef.current) {
            const age = Date.now() - ts;
            if (age < ttl) {
              safeSet(setIsLoading, false);
              safeSet(setIsRefetching, false);
              return;
            }
          }
        }

        // 3. Bail out early when the device is offline.
        const { isConnected } = await getNetworkStatus();
        if (!isConnected) {
          safeSet(setIsLoading, false);
          safeSet(setIsRefetching, false);
          return;
        }

        // 4. Fetch fresh data and update state + cache only when it changed.
        const freshData = await fetchFnRef.current();

        const hasChanged = !isDataEqual(freshData, currentDataRef.current);

        if (hasChanged || forceRefresh) {
          currentDataRef.current = freshData;
          currentKeyRef.current = key;
          storageSet(key, freshData); // synchronous write
          safeSet(setDataState, freshData);
        }

        // Always update the timestamp on a successful fetch.
        storageSetTimestamp(timestampKey, Date.now()); // synchronous write
      } catch (err) {
        if (signal?.aborted) return;
        console.error(`[useCachedData] Error for key "${key}":`, err);
        safeSet(setError, err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsRefetching(false);
        }
      }
    },
    // fetchFn is intentionally excluded — we use the stable fetchFnRef instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ttl, ...dependencies],
  );

  // Run on mount and whenever key, TTL, or deps change. Skipped entirely while
  // `enabled` is false so disabled hooks do no cache reads, no connectivity
  // checks and no writes (used for mock-only previews).
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    loadData(false, controller.signal);
    return () => controller.abort();
  }, [loadData, enabled]);

  // Manually push a new value into state and cache (e.g. from Realtime events).
  const updateLocalData = useCallback(
    async (newData: T): Promise<void> => {
      currentDataRef.current = newData;
      currentKeyRef.current = key;
      // Keep the snapshot coherent so a later key change cannot resurrect the
      // value that was in the cache at mount time.
      snapshotRef.current = { key, data: newData, present: true };
      setDataState(newData);
      storageSet(key, newData);
      storageSetTimestamp(`${key}_timestamp`, Date.now());
    },
    [key],
  );

  return {
    data,
    isLoading,
    isRefetching,
    error,
    refetch: loadData,
    setData: updateLocalData,
  };
}
