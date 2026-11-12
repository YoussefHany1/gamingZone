import { useCallback } from "react";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { useAuthGateStore } from "@/src/store/useAuthGateStore";

type RequireAuthOptions = {
  /** Optional route name to return to after auth (informational; validated by caller flow). */
  returnTo?: string;
};

/**
 * Returns a guard function that runs `action` immediately for signed-in users,
 * or opens the auth gate for guests and resumes the action after successful sign-in.
 */
export function useRequireAuth() {
  const { isSignedIn } = useAuthUser();
  const open = useAuthGateStore((s) => s.open);

  const requireAuth = useCallback(
    (action?: () => void, opts?: RequireAuthOptions) => {
      if (isSignedIn) {
        action?.();
        return true;
      }
      if (action || opts?.returnTo) {
        open({ pendingAction: action, returnTo: opts?.returnTo });
      } else {
        open();
      }
      return false;
    },
    [isSignedIn, open],
  );

  return requireAuth;
}

export default useRequireAuth;
