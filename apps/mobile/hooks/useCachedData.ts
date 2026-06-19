import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// Serves cached data immediately from AsyncStorage, then revalidates from the
// network in the background, following a Time-To-Live (TTL) cache policy.

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
  /** AsyncStorage key used for persistence. */
  key: string,
  /** Async function that fetches fresh data from the network. */
  fetchFn: () => Promise<T>,
  /** Re-fetch when any of these values change (same semantics as useEffect deps). */
  dependencies: unknown[] = [],
  /** How long (ms) cached data is considered fresh before a background re-fetch. Default: 5 minutes. */
  ttl: number = 300_000
): CachedDataResult<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Holds the latest in-memory copy so the Realtime callback and TTL check
  // can read it without triggering re-renders or being added to deps arrays.
  const currentDataRef = useRef<T | null>(null);

  // Stable ref to the fetch function so we don't need it in useCallback deps,
  // preventing unnecessary re-subscriptions when the caller recreates it.
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
        // 1. Serve whatever is in the cache immediately so the UI is never blank.
        if (!currentDataRef.current) {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const parsed = unwrapCachedValue<T>(JSON.parse(cached));
            currentDataRef.current = parsed;
            safeSet(setDataState, parsed);
            safeSet(setIsLoading, false);
          }
        }

        // 2. Respect TTL — skip the network call if the cache is still fresh.
        if (!forceRefresh) {
          const cachedTimestampStr = await AsyncStorage.getItem(timestampKey);
          if (cachedTimestampStr && currentDataRef.current) {
            const age = Date.now() - parseInt(cachedTimestampStr, 10);
            if (age < ttl) {
              safeSet(setIsLoading, false);
              safeSet(setIsRefetching, false);
              return;
            }
          }
        }

        // 3. Bail out early when the device is offline.
        const { isConnected } = await NetInfo.fetch();
        if (!isConnected) {
          safeSet(setIsLoading, false);
          safeSet(setIsRefetching, false);
          return;
        }

        // 4. Fetch fresh data and update state + cache only when it changed.
        const freshData = await fetchFnRef.current();

        const hasChanged =
          JSON.stringify(freshData) !== JSON.stringify(currentDataRef.current);

        if (hasChanged || forceRefresh) {
          currentDataRef.current = freshData;
          await AsyncStorage.setItem(key, JSON.stringify(freshData));
          safeSet(setDataState, freshData);
        }

        // Always update the timestamp on a successful fetch.
        await AsyncStorage.setItem(timestampKey, String(Date.now()));
      } catch (err) {
        if (signal?.aborted) return;
        console.error(`[useCachedData] Error for key "${key}":`, err);
        safeSet(
          setError,
          err instanceof Error ? err : new Error(String(err))
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsRefetching(false);
        }
      }
    },
    // fetchFn is intentionally excluded — we use the stable fetchFnRef instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ttl, ...dependencies]
  );

  // Run on mount and whenever the key, TTL, or deps change.
  // AbortController replaces the isMountedRef anti-pattern.
  useEffect(() => {
    const controller = new AbortController();
    loadData(false, controller.signal);
    return () => controller.abort();
  }, [loadData]);

  // Manually push a new value into state and cache (e.g. from Realtime events).
  const updateLocalData = useCallback(
    async (newData: T): Promise<void> => {
      currentDataRef.current = newData;
      setDataState(newData);
      await AsyncStorage.setItem(key, JSON.stringify(newData));
      await AsyncStorage.setItem(`${key}_timestamp`, String(Date.now()));
    },
    [key]
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
