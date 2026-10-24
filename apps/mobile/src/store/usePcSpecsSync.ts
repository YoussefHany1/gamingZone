/**
 * Keeps `usePcSpecsStore` in sync with the signed-in account.
 *
 * - Anonymous users stay local: the store only ever reads the guest MMKV key.
 * - On sign-in the account document is watched; account data wins, and a guest
 *   copy is migrated only when the account has none.
 * - The guest key is cleared after a successful migration write (or when the
 *   account already had specs), never before.
 */
import { useEffect, useRef } from "react";
import { useAuthStore } from "./useAuthStore";
import { usePcSpecsStore } from "./usePcSpecsStore";
import { resolvePcSpecsForUser } from "@/src/features/pcSpecs/lib/specsResolution";
import {
  clearGuestPcSpecs,
  readGuestPcSpecs,
  readLocalPcSpecs,
} from "@/src/features/pcSpecs/lib/specsStorage";
import {
  savePcSpecsToAccount,
  subscribePcSpecsToAccount,
} from "@/src/services/pcSpecsService";
import { logger } from "@/src/lib/logger";

export function usePcSpecsSync(): void {
  const user = useAuthStore((state) => state.user);

  /** Prevents the same guest/local copy from being uploaded twice. */
  const uploadInFlightRef = useRef<string | null>(null);
  /** Uids whose guest copy was already discarded in this session. */
  const clearedGuestRef = useRef<string | null>(null);

  useEffect(() => {
    uploadInFlightRef.current = null;
    clearedGuestRef.current = null;

    if (!user || user.isAnonymous) {
      usePcSpecsStore.getState().hydrate();
      return;
    }

    const uid = user.uid;
    let cancelled = false;

    // Paint the local account copy immediately; the snapshot below then
    // confirms or replaces it.
    usePcSpecsStore.getState().hydrate();

    const discardGuest = (): void => {
      if (clearedGuestRef.current === uid) return;
      clearedGuestRef.current = uid;
      clearGuestPcSpecs();
    };

    const unsubscribe = subscribePcSpecsToAccount(
      uid,
      ({ specs: remote }) => {
        if (cancelled) return;

        const resolution = resolvePcSpecsForUser({
          isAnonymous: false,
          remote,
          localAccount: readLocalPcSpecs(uid),
          guest: readGuestPcSpecs(),
        });

        usePcSpecsStore.getState().applyAccountSpecs(uid, resolution.specs);

        if (resolution.upload) {
          const key = `${uid}:${resolution.upload.updatedAt}`;
          if (uploadInFlightRef.current !== key) {
            uploadInFlightRef.current = key;
            const adoptedGuest = resolution.source === "guest";

            savePcSpecsToAccount(uid, resolution.upload)
              .then(() => {
                if (cancelled) return;
                // The account now owns these specs.
                if (adoptedGuest) discardGuest();
                else if (readGuestPcSpecs()) discardGuest();
              })
              .catch((error: unknown) => {
                uploadInFlightRef.current = null;
                logger.error("[usePcSpecsSync] Failed to sync PC specs:", error);
              });
          }
        } else if (resolution.clearGuest) {
          discardGuest();
        }
      },
      (error: unknown) => {
        // Offline or permission failure: keep the local copy already painted.
        logger.error("[usePcSpecsSync] PC specs snapshot error:", error);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);
}
