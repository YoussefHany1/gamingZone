/**
 * useAppOpenSync — silent library auto-refresh for linked accounts.
 *
 * Runs once per app launch (after auth resolves). For every linked account
 * whose `lastSyncedAt` is stale (see SYNC_STALE_MS), the library is re-imported
 * in the background.
 *
 * Rule: this path NEVER surfaces toasts. Failures are either retried on the
 * next app open (network) or reflected exclusively via the account status
 * (`reauth_required`) — which is set server-side and rendered as a subtle
 * reconnect banner in Settings, never as an error toast.
 */
import { useEffect, useRef } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  isAccountStale,
  syncPsnLibrary,
  syncSteamLibrary,
  syncXboxLibrary,
} from "@/src/features/settings/lib/platformSync";
import { logger } from "@/src/lib/logger";
import type { LinkedAccount } from "@/src/features/settings/types";

export default function useAppOpenSync(user: { uid: string } | null): void {
  // The ref keeps the effect to exactly one pass per mount, independent of
  // transient auth re-resolutions.
  const startedRef = useRef(false);

  useEffect(() => {
    const uid = user?.uid ?? auth().currentUser?.uid;
    if (!uid || startedRef.current) return;
    startedRef.current = true;

    void (async (): Promise<void> => {
      try {
        const linkedRef = firestore().collection("users").doc(uid).collection("linkedAccounts");
        const [steamSnap, psnSnap, xboxSnap] = await Promise.all([
          linkedRef.doc("steam").get(),
          linkedRef.doc("psn").get(),
          linkedRef.doc("xbox").get(),
        ]);

        const steamData = steamSnap.data() as LinkedAccount | undefined;
        const psnData = psnSnap.data() as LinkedAccount | undefined;
        const xboxData = xboxSnap.data() as LinkedAccount | undefined;

        if (steamData?.status !== "unlinked" && steamData?.steamId) {
          const stale = isAccountStale(steamData.lastSyncedAt);
          if (stale) {
            // Silent — outcomes are logged, never toasted.
            const outcome = await syncSteamLibrary(steamData.steamId);
            if (__DEV__) {
              logger.debug("[useAppOpenSync] Steam auto-sync outcome:", outcome);
            }
          }
        }

        if (psnData && psnData.status !== "unlinked" && psnData.status !== "reauth_required") {
          if (isAccountStale(psnData.lastSyncedAt)) {
            // On reauth_required the backend has already flipped the account
            // status; the reconnect banner in Settings picks it up, so the
            // stale reauth case is skipped here without any toast.
            const outcome = await syncPsnLibrary();
            if (__DEV__) {
              logger.debug("[useAppOpenSync] PSN auto-sync outcome:", outcome);
            }
          }
        }

        // Xbox runs last — it is the slowest adapter (Microsoft token refresh
        // + Xbox Live handshake + two library calls).
        if (xboxData && xboxData.status !== "unlinked" && xboxData.status !== "reauth_required") {
          if (isAccountStale(xboxData.lastSyncedAt)) {
            const outcome = await syncXboxLibrary();
            if (__DEV__) {
              logger.debug("[useAppOpenSync] Xbox auto-sync outcome:", outcome);
            }
          }
        }
      } catch (e) {
        logger.warn("[useAppOpenSync] auto-sync pass failed (will retry next launch):", e);
      }
    })();
  }, [user?.uid]);
}
