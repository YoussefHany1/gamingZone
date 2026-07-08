import { useAuthStore } from "../store/useAuthStore";
import { useShallow } from "zustand/react/shallow";

/**
 * Returns pre-computed auth state flags derived from the global auth store.
 *
 * All values are computed once here so every screen/component can import
 * a single hook instead of repeating `user?.isAnonymous` checks everywhere.
 *
 * Uses a single `useShallow` selector to avoid triggering two separate
 * re-renders when both `user` and `isLoading` change at the same time.
 *
 * @example
 * const { isSignedIn, isAnonymous, isGuest, user } = useAuthUser();
 */
export function useAuthUser() {
  const { user, isLoading } = useAuthStore(
    useShallow((s) => ({ user: s.user, isLoading: s.isLoading })),
  );

  /** true if Firebase has a user object (signed-in OR anonymous) */
  const hasUser = user !== null;

  /** true only when the user signed in with email / Google / etc. (not anonymous) */
  const isSignedIn = hasUser && !user!.isAnonymous;

  /** true when the user is in the anonymous / guest state */
  const isAnonymous = hasUser && user!.isAnonymous;

  /** alias for isAnonymous — use whichever reads better in context */
  const isGuest = isAnonymous;

  return {
    user,
    isLoading,
    hasUser,
    isSignedIn,
    isAnonymous,
    isGuest,
  };
}
