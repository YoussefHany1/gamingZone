import { useEffect } from "react";
import firestore from "@react-native-firebase/firestore";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import { claimGeneratedHandle } from "../lib/profileService";

/**
 * Ensures every signed-in account has a public profile and a reserved handle.
 *
 * Registration claims one explicitly; this covers the paths that do not (Google,
 * Discord, accounts created before Phase 1, and a registration whose request
 * failed because the backend was briefly unreachable). It is a no-op once
 * `profiles/{uid}` exists *and* carries a handle, so it can live at the
 * navigator level and run on every session without writing anything.
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

    const ensureProfile = async (): Promise<void> => {
      const snapshot = await firestore().collection("profiles").doc(uid).get();
      if (cancelled) return;

      // A document with no handle is a half-written claim (the backend call
      // failed between the profile write and the reservation). Claiming is
      // idempotent for the current owner, so retrying is safe.
      const handle = (snapshot.data() as { handleLower?: unknown } | undefined)?.handleLower;
      if (typeof handle === "string" && handle) return;

      const claimed = await claimGeneratedHandle(displayName, uid);
      if (!claimed) {
        logger.warn("[useProfileBootstrap] no handle candidate was free", { uid });
      }
    };

    void ensureProfile().catch((error) => {
      logger.warn("[useProfileBootstrap] could not bootstrap profile:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [uid, isAnonymous, displayName]);
}
