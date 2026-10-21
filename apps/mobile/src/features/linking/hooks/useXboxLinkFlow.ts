/**
 * useXboxLinkFlow — the Xbox (Microsoft account) linking flow.
 *
 * The backend owns the whole OAuth handshake (PKCE, MSA token exchange, the
 * Xbox Live → XSTS chain) and finishes with a 302 to
 * `gaming-zone://xbox-link`. Inside the WebView that redirect never reaches
 * the OS, so the panel intercepts it and hands the URL to `handleCallbackUrl`
 * here — the same entry point the OS deep link uses.
 */
import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Linking, ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import { fetchLinkState } from "@/src/services/api/linkedAccountsApi";
import { syncXboxLibrary } from "@/src/features/settings/lib/platformSync";
import type { LinkedAccountPlatform } from "@/src/features/settings/types";
import type { LinkPanel } from "@/src/features/linking/lib/types";
import {
  decodeQueryValue,
  readQueryParam,
} from "@/src/features/linking/lib/callbackQuery";
import { useLinkToasts } from "@/src/features/linking/hooks/useLinkToasts";
import { logger } from "@/src/lib/logger";

export type UseXboxLinkFlowOptions = {
  setBusy: Dispatch<SetStateAction<boolean>>;
  setPanel: Dispatch<SetStateAction<LinkPanel>>;
  waitForMounted: (
    platform: LinkedAccountPlatform,
    timeoutMs?: number,
  ) => Promise<boolean>;
};

export type XboxLinkFlow = {
  /** The backend `/xbox/authorize` URL while the sign-in panel is open. */
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

export function useXboxLinkFlow({
  setBusy,
  setPanel,
  waitForMounted,
}: UseXboxLinkFlowOptions): XboxLinkFlow {
  const { t } = useTranslation();
  const { toastXboxOutcome, xboxFailureMessage } = useLinkToasts();
  const [startUrl, setStartUrl] = useState<string | null>(null);
  /** Guards the at-most-once handling of the Xbox callback redirect. */
  const callbackLock = useRef(false);

  /**
   * Opens the Microsoft sign-in. The backend owns the whole handshake: it
   * hands us a start URL that ends in `/xbox/authorize`, which redirects to
   * Microsoft and (after the user signs in) back into the app.
   */
  const openSignIn = useCallback(async (): Promise<void> => {
    try {
      const result = await fetchLinkState("xbox");
      if (!result.ok || !result.data?.startUrl) {
        // 503 → the server has no Xbox app registered (not a user error).
        if (!result.ok && result.status === 503) {
          ToastAndroid.show(
            xboxFailureMessage("not_configured"),
            ToastAndroid.LONG,
          );
          return;
        }
        throw new Error(
          result.ok ? "state fetch failed" : `state fetch failed (HTTP ${result.status ?? "?"})`,
        );
      }
      callbackLock.current = false;
      setStartUrl(result.data.startUrl);
      setPanel("xboxWebView");
    } catch (e) {
      logger.error("[useXboxLinkFlow] Xbox sign-in failed", e);
      ToastAndroid.show(xboxFailureMessage("auth_failed"), ToastAndroid.LONG);
    }
  }, [xboxFailureMessage, setPanel]);

  /**
   * Handles the `gaming-zone://xbox-link` redirect — parses the outcome and
   * runs the post-link library sync.
   */
  const handleCallbackUrl = useCallback(
    async (url: string): Promise<void> => {
      if (callbackLock.current) return;
      callbackLock.current = true;
      setStartUrl(null);
      setPanel("choose");

      const param = (name: string): string =>
        decodeQueryValue(readQueryParam(url, name));

      try {
        if (param("status") === "success") {
          // The server wrote the linkedAccounts doc before redirecting; give it
          // a moment to appear via the onSnapshot subscription, then import.
          setBusy(true);
          await waitForMounted("xbox");
          const outcome = await syncXboxLibrary();
          setBusy(false);
          toastXboxOutcome(outcome);
          return;
        }

        const reason = param("reason") || "unknown";
        logger.warn("[useXboxLinkFlow] Xbox sign-in rejected:", reason);
        ToastAndroid.show(xboxFailureMessage(reason), ToastAndroid.LONG);
      } catch (e) {
        logger.error("[useXboxLinkFlow] Xbox callback handling failed:", e);
        setBusy(false);
        ToastAndroid.show(
          t("settings.profile.linking.messages.syncFailed") || "Sync failed",
          ToastAndroid.SHORT,
        );
      }
    },
    [setBusy, setPanel, t, toastXboxOutcome, waitForMounted, xboxFailureMessage],
  );

  /**
   * Continues the Microsoft sign-in in the system browser. The backend's
   * `gaming-zone://xbox-link` redirect is delivered as a deep link into the
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
        t("settings.profile.linking.xbox.browserHint") ||
          "Finish signing in in your browser - we sync your library automatically afterwards.",
        ToastAndroid.LONG,
      );
    } catch (e) {
      logger.warn("[useXboxLinkFlow] could not open external browser for Xbox:", e);
      ToastAndroid.show(xboxFailureMessage("auth_failed"), ToastAndroid.LONG);
    }
  }, [startUrl, t, setPanel, xboxFailureMessage]);

  const syncNow = useCallback(async (): Promise<void> => {
    setBusy(true);
    const outcome = await syncXboxLibrary();
    setBusy(false);
    toastXboxOutcome(outcome);
  }, [setBusy, toastXboxOutcome]);

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
