import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfileSearchHit } from "@gaming-zone/core";
import { normalizeProfileSearch, PROFILE_SEARCH_MIN_LENGTH } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import { searchProfiles } from "../lib/friendService";

export type ProfileSearchResult = {
  /** Raw input, exactly as typed. */
  query: string;
  setQuery: (value: string) => void;
  /** Normalised query the backend receives. */
  normalizedQuery: string;
  /** True once the normalised query is long enough to search. */
  active: boolean;
  results: ProfileSearchHit[];
  searching: boolean;
  error: unknown;
  /** Search immediately, bypassing the debounce (pull-to-refresh). */
  refresh: () => Promise<ProfileSearchHit[]>;
  clear: () => void;
};

const DEBOUNCE_MS = 300;

/**
 * Debounced handle search with latest-request-wins semantics.
 *
 * A monotonic id is stored in a ref and compared when a response arrives, so a
 * slow request for an older query can never overwrite the results of a newer
 * one. The id is bumped as soon as the query changes (not when the debounced
 * request fires), which also closes the gap between keystrokes.
 */
export function useProfileSearch(debounceMs = DEBOUNCE_MS): ProfileSearchResult {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const normalizedQuery = normalizeProfileSearch(query);
  const active = normalizedQuery.length >= PROFILE_SEARCH_MIN_LENGTH;

  const run = useCallback(
    async (term: string, id: number): Promise<ProfileSearchHit[]> => {
      setSearching(true);
      try {
        const next = await searchProfiles(term);
        if (id === requestId.current) {
          setResults(next);
          setError(null);
        }
        return next;
      } catch (reason) {
        if (id === requestId.current) {
          logger.error("[social] Search failed", reason);
          setError(reason);
        }
        return [];
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Invalidate whatever was in flight for the previous query immediately.
    const id = ++requestId.current;

    if (!active) {
      setSearching(false);
      setError(null);
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      void run(normalizedQuery, id);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [active, normalizedQuery, debounceMs, run]);

  const refresh = useCallback(() => {
    const id = ++requestId.current;
    return run(normalizedQuery, id);
  }, [normalizedQuery, run]);

  const clear = useCallback(() => {
    requestId.current += 1;
    setQuery("");
    setResults([]);
    setSearching(false);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    normalizedQuery,
    active,
    results,
    searching,
    error,
    refresh,
    clear,
  };
}
