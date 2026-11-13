import { useCallback, useEffect, useState } from "react";
import { fetchAdminAudit, type AdminApiError } from "../lib/adminApi";
import type { AdminAuditEntry } from "../types";

export type UseAdminAuditResult = {
  entries: AdminAuditEntry[];
  loading: boolean;
  error: AdminApiError | null;
  refresh: () => Promise<void>;
};

/** Recent admin actions (promote/demote/disable/enable) from `adminAuditLogs`. */
export function useAdminAudit(limit = 50): UseAdminAuditResult {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AdminApiError | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await fetchAdminAudit(limit);
      setEntries(next);
      setError(null);
    } catch (reason) {
      setError(reason as AdminApiError);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, loading, error, refresh: load };
}
