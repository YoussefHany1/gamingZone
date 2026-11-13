import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAdminUsers, type AdminApiError } from "../lib/adminApi";
import type { AdminUserFilter, AdminUserRow } from "../types";

const DEBOUNCE_MS = 300;

export type UseAdminUsersResult = {
  query: string;
  setQuery: (value: string) => void;
  filter: AdminUserFilter;
  setFilter: (value: AdminUserFilter) => void;
  rows: AdminUserRow[];
  mode: string;
  loading: boolean;
  loadingMore: boolean;
  error: AdminApiError | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
};

/**
 * Debounced user search / browse with cursor pagination.
 *
 * Empty query browses recent users (newest first); a 2+ character query runs
 * the backend's exact-id/email/handle lookups plus prefix match on the
 * normalized name/email fields. Requests are latest-wins.
 */
export function useAdminUsers(limit = 25): UseAdminUsersResult {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<AdminUserFilter>("all");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [mode, setMode] = useState("browse");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const loadFirst = useCallback(async (): Promise<void> => {
    const id = ++requestId.current;
    setLoading(true);

    try {
      const page = await fetchAdminUsers({ query: debouncedQuery, filter, limit });
      if (id !== requestId.current) return;
      setRows(page.users);
      setNextCursor(page.nextCursor);
      setMode(page.mode);
      setError(null);
    } catch (reason) {
      if (id === requestId.current) setError(reason as AdminApiError);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [debouncedQuery, filter, limit]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!nextCursor || loadingMore) return;

    const id = requestId.current;
    setLoadingMore(true);

    try {
      const page = await fetchAdminUsers({
        query: debouncedQuery,
        filter,
        limit,
        cursor: nextCursor,
      });
      if (id !== requestId.current) return;

      setRows((previous) => {
        const seen = new Set(previous.map((row) => row.uid));
        return [...previous, ...page.users.filter((row) => !seen.has(row.uid))];
      });
      setNextCursor(page.nextCursor);
    } catch (reason) {
      if (id === requestId.current) setError(reason as AdminApiError);
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, debouncedQuery, filter, limit]);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    rows,
    mode,
    loading,
    loadingMore,
    error,
    refresh: loadFirst,
    loadMore,
    hasMore: Boolean(nextCursor),
  };
}
