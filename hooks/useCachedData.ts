import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// Serves cached data immediately from AsyncStorage, then revalidates from the
// network in the background, adhering to a Time-To-Live (TTL) cache policy.

// Types
export interface CachedDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
  setData: (newData: T) => Promise<void>;
}

export default function useCachedData<T>(
  key: string, // cache key
  fetchFunction: () => Promise<T>, // fetches data
  dependencies: unknown[] = [], // refetch when changed
  ttl: number = 300000 // default TTL: 5 minutes (300,000 milliseconds)
): CachedDataResult<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const currentDataRef = useRef<T | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const loadData = useCallback(async (forceRefresh = false): Promise<void> => {
    try {
      if (isMountedRef.current) {
        setIsRefetching(true);
        setError(null);
      }

      const timestampKey = `${key}_timestamp`;

      // 1. Serve whatever is in the cache immediately to the UI
      if (!currentDataRef.current) {
        const cached = await AsyncStorage.getItem(key);
        if (cached && isMountedRef.current) {
          const raw = JSON.parse(cached);
          const parsed: T =
            raw !== null &&
            typeof raw === "object" &&
            !Array.isArray(raw) &&
            "data" in raw &&
            "timestamp" in raw
              ? (raw as { data: T; timestamp: number }).data
              : (raw as T);
          setDataState(parsed);
          currentDataRef.current = parsed;
          setIsLoading(false);
        }
      }

      // 2. Adhere to TTL Policy: check if cached data is still fresh
      if (!forceRefresh) {
        const cachedTimestampStr = await AsyncStorage.getItem(timestampKey);
        if (cachedTimestampStr && currentDataRef.current) {
          const cachedTimestamp = parseInt(cachedTimestampStr, 10);
          const age = Date.now() - cachedTimestamp;
          if (age < ttl) {
            // Cache is fresh, skip initial background network fetch to reduce reads
            if (isMountedRef.current) {
              setIsLoading(false);
              setIsRefetching(false);
            }
            return;
          }
        }
      }

      // If user is offline, stop here
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefetching(false);
        }
        return;
      }

      // 3. Fetch fresh data from the network
      const freshData: T = await fetchFunction();

      // Only update state AND cache when data actually changed
      const isDataDifferent =
        JSON.stringify(freshData) !== JSON.stringify(currentDataRef.current);

      if (isDataDifferent || forceRefresh) {
        currentDataRef.current = freshData;
        await AsyncStorage.setItem(key, JSON.stringify(freshData));
        if (isMountedRef.current) {
          setDataState(freshData);
        }
      }
      
      // Update the timestamp on successful fetch
      await AsyncStorage.setItem(timestampKey, String(Date.now()));
    } catch (err) {
      console.error(`[useCachedData] Error for key "${key}":`, err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [key, ttl, ...dependencies]);

  // Track mount status to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Run on mount and whenever loadData identity changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manually update state and cache
  const updateLocalData = useCallback(
    async (newData: T): Promise<void> => {
      setDataState(newData);
      currentDataRef.current = newData;
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
