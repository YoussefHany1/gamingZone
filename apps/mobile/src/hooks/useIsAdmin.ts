/**
 * Admin access, backed by the Firebase custom claim `admin`.
 *
 * The claim is the only trusted admin signal: `users/{uid}.isAdmin` is a
 * display-only mirror the client can no longer write (see firestore.rules),
 * and every `/admin/*` endpoint re-verifies the claim server-side. This hook is
 * therefore a UX gate, never a security boundary.
 *
 * Claims ride on the cached ID token, so a just-promoted admin keeps seeing the
 * old value until the token refreshes. `refresh()` forces
 * `getIdTokenResult(true)` and is called when the dashboard gains focus and
 * after role changes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import auth from "@react-native-firebase/auth";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";

const CACHE_TTL_MS = 5 * 60_000;

type AdminCacheEntry = {
  uid: string;
  isAdmin: boolean;
  checkedAt: number;
};

// Module-level cache: the Settings menu, navigation guards and the dashboard
// all mount the hook, but only one token read per uid/TTL is needed.
let adminCache: AdminCacheEntry | null = null;

/** Drops the cached verdict (sign-out, or a backend `403 admin_required`). */
export function invalidateAdminAccessCache(): void {
  adminCache = null;
}

function readCache(uid: string): AdminCacheEntry | null {
  if (
    adminCache &&
    adminCache.uid === uid &&
    Date.now() - adminCache.checkedAt < CACHE_TTL_MS
  ) {
    return adminCache;
  }
  return null;
}

export type AdminAccess = {
  isAdmin: boolean;
  /** True until the token claim has been read for the current user. */
  isLoading: boolean;
  error: Error | null;
  /** Force-refreshes the ID token and re-reads the claim. */
  refresh: () => Promise<boolean>;
};

export function useAdminAccess(): AdminAccess {
  const uid = useAuthStore((state) => state.user?.uid ?? null);

  const [isAdmin, setIsAdmin] = useState<boolean>(() =>
    uid ? (readCache(uid)?.isAdmin ?? false) : false,
  );
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    uid ? readCache(uid) === null : false,
  );
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const resolve = useCallback(async (forceRefresh: boolean): Promise<boolean> => {
    const current = auth().currentUser;

    if (!current) {
      adminCache = null;
      if (isMounted.current) {
        setIsAdmin(false);
        setIsLoading(false);
        setError(null);
      }
      return false;
    }

    if (!forceRefresh) {
      const cached = readCache(current.uid);
      if (cached) {
        if (isMounted.current) {
          setIsAdmin(cached.isAdmin);
          setIsLoading(false);
          setError(null);
        }
        return cached.isAdmin;
      }
    }

    if (isMounted.current) setIsLoading(true);

    try {
      const result = await current.getIdTokenResult(forceRefresh);
      const nextIsAdmin = result.claims.admin === true;
      adminCache = { uid: current.uid, isAdmin: nextIsAdmin, checkedAt: Date.now() };

      if (isMounted.current) {
        setIsAdmin(nextIsAdmin);
        setIsLoading(false);
        setError(null);
      }
      return nextIsAdmin;
    } catch (reason) {
      // A revoked/expired token is expected after an admin action revokes
      // refresh tokens. Report it, but never grant access on a failed read.
      adminCache = null;
      logger.warn("[useIsAdmin] Could not read the admin claim", reason);

      if (isMounted.current) {
        setIsAdmin(false);
        setIsLoading(false);
        setError(reason instanceof Error ? reason : new Error(String(reason)));
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      adminCache = null;
      setIsAdmin(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(readCache(uid) === null);
    void resolve(false);
  }, [uid, resolve]);

  const refresh = useCallback(() => resolve(true), [resolve]);

  return { isAdmin, isLoading, error, refresh };
}

/**
 * Backwards-compatible boolean gate for existing consumers. New code that
 * needs to avoid an "access denied" flash should use {@link useAdminAccess}.
 */
export function useIsAdmin(): boolean {
  return useAdminAccess().isAdmin;
}
