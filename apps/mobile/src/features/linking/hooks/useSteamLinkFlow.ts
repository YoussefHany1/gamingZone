/**
 * useSteamLinkFlow — the Steam (OpenID) linking flow.
 *
 * The backend owns the handshake: it hands out a signed `state` plus Steam's
 * OpenID login URL, and 302-redirects back to `gaming-zone://steam-link`
 * once the user confirmed. The redirect never reaches the OS from inside the
 * WebView, so the panel intercepts it and hands the URL to `handleCallbackUrl`
 * here — the very same entry point the OS deep link uses.
 */
import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Linking, ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { fetchLinkState } from "@/src/services/api/linkedAccountsApi";
import { syncSteamLibrary } from "@/src/features/settings/lib/platformSync";
import type {
  LinkedAccount,
  LinkedAccountPlatform,
} from "@/src/features/settings/types";
import type { LinkPanel } from "@/src/features/linking/lib/types";
import {
  decodeQueryValue,
  readQueryParam,
} from "@/src/features/linking/lib/callbackQuery";
import { useLinkToasts } from "@/src/features/linking/hooks/useLinkToasts";
import { logger } from "@/src/lib/logger";

export type UseSteamLinkFlowOptions = {
  /** The live linked-account doc (null while not connected). */
  account: LinkedAccount | null;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setPanel: Dispatch<SetStateAction<LinkPanel>>;
  waitForMounted: (
    platform: LinkedAccountPlatform,
    timeoutMs?: number,
  ) => Promise<boolean>;
};

export type SteamLinkFlow = {
  /** The Steam OpenID URL while the sign-in panel is open. */
  startUrl: string | null;
  openSignIn: () => Promise<void>;
  handleCallbackUrl: (url: string) => Promise<void>;
  openExternal: () => Promise<void>;
  syncNow: () => Promise<void>;
  /** Leaves the sign-in panel and returns to the platform list. */
  cancel: () => void;
  /** Drops every transient value (used when the modal closes). */
  reset: () => void;
};

export function useSteamLinkFlow({
  account,
  setBusy,
  setPanel,
  waitForMounted,
}: UseSteamLinkFlowOptions): SteamLinkFlow {
  const { t } = useTranslation();
  const { toastSteamOutcome } = useLinkToasts();
  const [startUrl, setStartUrl] = useState<string | null>(null);
  /** Guards the at-most-once handling of the Steam callback redirect. */
  const callbackLock = useRef(false);

  /** Imports the Steam library and reports the outcome. Never throws. */
  const runSync = useCallback(
    async (explicitSteamId?: string | null): Promise<void> => {
      // Priority: the id carried by the OpenID callback → the live snapshot →
      // a direct read (the snapshot can lag a fresh sign-in).
      let steamId = explicitSteamId || account?.steamId || "";
      if (!steamId) {
        const uid = auth().currentUser?.uid;
        if (uid) {
          try {
            const snap = await firestore()
              .collection("users")
              .doc(uid)
              .collection("linkedAccounts")
              .doc("steam")
              .get();
            const doc = snap.data() as LinkedAccount | undefined;
            // Skip "unlinked"/reauth docs — they are not usable for syncing.
            if (doc?.steamId && doc?.status !== "unlinked") {
              steamId = doc.steamId;
            }
          } catch (e) {
            logger.warn("[useSteamLinkFlow] could not read the linked Steam account:", e);
          }
        }
      }
      if (!steamId) {
        setBusy(false);
        // Never fail silently — the user must know what to do next.
        ToastAndroid.show(
          t("settings.profile.linking.messages.signInRequired") ||
            "Sign in with Steam first",
          ToastAndroid.LONG,
        );
        return;
      }
      const outcome = await syncSteamLibrary(steamId);
      setBusy(false);
      toastSteamOutcome(outcome);
    },
    [account?.steamId, setBusy, t, toastSteamOutcome],
  );

  /** Opens the Steam OpenID login page as an in-app WebView panel. */
  const openSignIn = useCallback(async (): Promise<void> => {
    try {
      const result = await fetchLinkState("steam");
      if (!result.ok || !result.data?.startUrl) {
        throw new Error(
          result.ok ? "state fetch failed" : `state fetch failed (HTTP ${result.status ?? "?"})`,
        );
      }
      callbackLock.current = false;
      setStartUrl(result.data.startUrl);
      setPanel("steamWebView");
    } catch (e) {
      logger.error("[useSteamLinkFlow] Steam sign-in failed", e);
      ToastAndroid.show(
        t("settings.profile.linking.steam.errorFailed") || "Steam sign-in failed",
        ToastAndroid.LONG,
      );
    }
  }, [t, setPanel]);

  /**
   * Handles the `gaming-zone://steam-link` redirect — parses the outcome and
   * runs the post-link library sync.
   */
  const handleCallbackUrl = useCallback(
    async (url: string): Promise<void> => {
      if (callbackLock.current) return;
      callbackLock.current = true;
      setStartUrl(null);
      setPanel("choose");

      const status = readQueryParam(url, "status");
      const reason = readQueryParam(url, "reason");

      try {
        if (status === "success") {
          // The server wrote the linkedAccounts doc before redirecting; give it
          // a moment to appear via the onSnapshot subscription. The Steam ID
          // in the callback lets the sync run even if that read fails.
          setBusy(true);
          await waitForMounted("steam");
          const steamIdParam = readQueryParam(url, "steamId");
          await runSync(steamIdParam ? decodeQueryValue(steamIdParam) : null);
          return;
        }

        logger.warn(
          "[useSteamLinkFlow] Steam sign-in rejected:",
          reason || "unknown",
        );
        ToastAndroid.show(
          t("settings.profile.linking.steam.errorFailed") || "Steam sign-in failed",
          ToastAndroid.LONG,
        );
      } catch (e) {
        logger.error("[useSteamLinkFlow] Steam callback handling failed:", e);
        setBusy(false);
        ToastAndroid.show(
          t("settings.profile.linking.messages.syncFailed") || "Sync failed",
          ToastAndroid.SHORT,
        );
      }
    },
    [runSync, setBusy, setPanel, t, waitForMounted],
  );

  /**
   * Continues the OpenID sign-in in the system browser. The backend's
   * `gaming-zone://steam-link` redirect is delivered as a deep link into the
   * app and re-enters the exact same handler the WebView intercept uses.
   */
  const openExternal = useCallback(async (): Promise<void> => {
    if (!startUrl) return;
    const url = startUrl;
    callbackLock.current = false;
    setStartUrl(null);
    setPanel("choose");
    try {
      await Linking.openURL(url);
      ToastAndroid.show(
        t("settings.profile.linking.steam.browserHint") ||
          "Finish signing in in your browser - we sync automatically afterwards.",
        ToastAndroid.LONG,
      );
    } catch (e) {
      logger.warn("[useSteamLinkFlow] could not open external browser for Steam:", e);
      ToastAndroid.show(
        t("settings.profile.linking.steam.errorFailed") || "Steam sign-in failed",
        ToastAndroid.LONG,
      );
    }
  }, [startUrl, t, setPanel]);

  const syncNow = useCallback(async (): Promise<void> => {
    setBusy(true);
    // `runSync` clears `busy` in every branch.
    await runSync();
  }, [runSync, setBusy]);

  const cancel = useCallback((): void => {
    callbackLock.current = false;
    setStartUrl(null);
    setPanel("choose");
  }, [setPanel]);

  const reset = useCallback((): void => {
    callbackLock.current = false;
    setStartUrl(null);
  }, []);

  return { startUrl, openSignIn, handleCallbackUrl, openExternal, syncNow, cancel, reset };
}
