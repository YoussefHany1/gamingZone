import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// Serves cached data immediately from AsyncStorage, then revalidates from the
// network in the background. The cache is only written when the fresh data
// actually differs from what was previously stored.

// Types
export interface CachedDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: (newData: T) => Promise<void>;
}

// main
export default function useCachedData<T>(
  key: string, // cache key
  fetchFunction: () => Promise<T>, // fetches data
  dependencies: unknown[] = [] // refetch when changed
): CachedDataResult<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const currentDataRef = useRef<T | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsRefetching(true);
      setError(null);

      // Serve whatever is in the cache immediately (no TTL expiry)
      if (!currentDataRef.current) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const raw = JSON.parse(cached);
          // Migration: handle old {data, timestamp} wrapper format that was
          // temporarily used — extract the inner data if detected.
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

      // If user is offline, stop here
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        setIsLoading(false);
        setIsRefetching(false);
        return;
      }

      // Fetch fresh data from the network
      const freshData: T = await fetchFunction();

      // Only update state AND cache when data actually changed
      const isDataDifferent =
        JSON.stringify(freshData) !== JSON.stringify(currentDataRef.current);

      if (isDataDifferent) {
        setDataState(freshData);
        currentDataRef.current = freshData;
        await AsyncStorage.setItem(key, JSON.stringify(freshData));
      }
    } catch (err) {
      console.error(`[useCachedData] Error for key "${key}":`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [key, ...dependencies]);

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