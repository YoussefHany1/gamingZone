"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ensurePublicProfile } from "../lib/publicProfile";

/**
 * Ensures every signed-in account has a public profile and a reserved handle.
 *
 * Registration claims one explicitly; this covers Google sign-in, accounts
 * created before Phase 1, and a registration whose request failed because
 * the backend was briefly unreachable. It is a no-op once `profiles/{uid}`
 * exists *and* carries a handle, so it can live at the provider level and run
 * on every session.
 *
 * Guests are skipped: anonymous sessions are ephemeral and have no public
 * identity to protect.
 */
export function useProfileBootstrap(): void {
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const isAnonymous = useAuthStore((state) => state.user?.isAnonymous ?? true);
  const displayName = useAuthStore((state) => state.user?.displayName ?? "");

  useEffect(() => {
    if (!uid || isAnonymous) return;

    let cancelled = false;

    void ensurePublicProfile(uid, displayName).catch((error) => {
      if (!cancelled) {
        console.warn("[useProfileBootstrap] could not bootstrap profile:", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uid, isAnonymous, displayName]);
}
