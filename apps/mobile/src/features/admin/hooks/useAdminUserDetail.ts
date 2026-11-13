import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAdminUser, type AdminApiError } from "../lib/adminApi";
import type { AdminUserDetail } from "../types";

export type UseAdminUserDetailResult = {
  data: AdminUserDetail | null;
  loading: boolean;
  refreshing: boolean;
  error: AdminApiError | null;
  refresh: () => Promise<void>;
};

/** Loads one sanitized user detail payload, refreshing after every action. */
export function useAdminUserDetail(uid: string | null): UseAdminUserDetailResult {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (mode: "initial" | "refresh"): Promise<void> => {
      if (!uid) {
        setData(null);
        setLoading(false);
        return;
      }

      const id = ++requestId.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const next = await fetchAdminUser(uid);
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
    [uid],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const refresh = useCallback(() => load("refresh"), [load]);

  return { data, loading, refreshing, error, refresh };
}
