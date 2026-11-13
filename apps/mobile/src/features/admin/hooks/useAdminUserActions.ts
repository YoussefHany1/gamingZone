import { useCallback, useState } from "react";
import { setAdminRole, setUserDisabled, type AdminApiError } from "../lib/adminApi";

export type AdminActionKind = "admin" | "disabled";

export type UseAdminUserActionsResult = {
  pending: AdminActionKind | null;
  error: AdminApiError | null;
  clearError: () => void;
  setAdmin: (uid: string, enabled: boolean) => Promise<boolean>;
  setDisabled: (uid: string, disabled: boolean) => Promise<boolean>;
};

/**
 * Runs the destructive admin actions against the backend. Resolves `true` when
 * the server confirmed the change so the caller can refresh its data; the
 * backend remains the authority on last-admin/self-action guards.
 */
export function useAdminUserActions(onSuccess?: () => void): UseAdminUserActionsResult {
  const [pending, setPending] = useState<AdminActionKind | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);

  const run = useCallback(
    async (kind: AdminActionKind, action: () => Promise<unknown>): Promise<boolean> => {
      if (pending) return false;
      setPending(kind);
      setError(null);

      try {
        await action();
        onSuccess?.();
        return true;
      } catch (reason) {
        setError(reason as AdminApiError);
        return false;
      } finally {
        setPending(null);
      }
    },
    [pending, onSuccess],
  );

  const setAdmin = useCallback(
    (uid: string, enabled: boolean) => run("admin", () => setAdminRole(uid, enabled)),
    [run],
  );

  const setDisabled = useCallback(
    (uid: string, disabled: boolean) => run("disabled", () => setUserDisabled(uid, disabled)),
    [run],
  );

  const clearError = useCallback(() => setError(null), []);

  return { pending, error, clearError, setAdmin, setDisabled };
}
