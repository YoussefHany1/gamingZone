import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAdminOverview, type AdminApiError } from "../lib/adminApi";
import type { AdminOverview, AdminRange } from "../types";

export type UseAdminOverviewResult = {
  data: AdminOverview | null;
  loading: boolean;
  refreshing: boolean;
  error: AdminApiError | null;
  refresh: () => Promise<void>;
};

/**
 * Overview KPIs/charts for a range. The backend caches for 45s and marks the
 * recent-signup sample `approximate`; no response is persisted on device.
 */
export function useAdminOverview(range: AdminRange): UseAdminOverviewResult {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (mode: "initial" | "refresh"): Promise<void> => {
      const id = ++requestId.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const next = await fetchAdminOverview(range);
        if (id !== requestId.current) return;
        setData(next);
        setError(null);
      } catch (reason) {
        if (id === requestId.current) setError(reason as AdminApiError);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [range],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const refresh = useCallback(() => load("refresh"), [load]);

  return { data, loading, refreshing, error, refresh };
}
