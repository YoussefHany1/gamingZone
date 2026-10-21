/**
 * usePsnLinkFlow — the PlayStation (NPSSO) linking flow.
 *
 * Sony has no redirect we could follow, so the token is captured inside our
 * own WebView: the probe script reads the ssocookie JSON and posts it back
 * through the WebView bridge (see `lib/psnProbe.ts`). A manual paste of the
 * NPSSO token stays available as a fallback.
 */
import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Linking, ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import { linkPsnAccount } from "@/src/services/api/linkedAccountsApi";
import { syncPsnLibrary } from "@/src/features/settings/lib/platformSync";
import type { LinkPanel } from "@/src/features/linking/lib/types";
import { PSN_SIGNIN_URL } from "@/src/features/linking/lib/constants";
import { useLinkToasts } from "@/src/features/linking/hooks/useLinkToasts";
import { logger } from "@/src/lib/logger";

export type UsePsnLinkFlowOptions = {
  setBusy: Dispatch<SetStateAction<boolean>>;
  setPanel: Dispatch<SetStateAction<LinkPanel>>;
};

export type PsnLinkFlow = {
  /** True when the WebView found no PlayStation session to work with. */
  sessionHint: boolean;
  openWebView: () => void;
  /** The WebView answered "no active session" — show the hint. */
  markSessionError: () => void;
  /** The user retried the token capture — hide the hint again. */
  clearSessionHint: () => void;
  openManual: () => void;
  openExternal: () => Promise<void>;
  /** Links the account with a captured/pasted NPSSO token and syncs. */
  submitNpsso: (npsso: string) => Promise<void>;
  syncNow: () => Promise<void>;
  /** Leaves the current panel and returns to the platform list. */
  cancel: () => void;
  /** Drops every transient value (used when the modal closes). */
  reset: () => void;
};

export function usePsnLinkFlow({
  setBusy,
  setPanel,
}: UsePsnLinkFlowOptions): PsnLinkFlow {
  const { t } = useTranslation();
  const { toastPsnOutcome } = useLinkToasts();
  const [sessionHint, setSessionHint] = useState(false);

  /** Opens the PSN sign-in WebView with a clean hint state. */
  const openWebView = useCallback((): void => {
    setSessionHint(false);
    setPanel("psnWebView");
  }, [setPanel]);

  const openManual = useCallback((): void => {
    setSessionHint(false);
    setPanel("psnManual");
  }, [setPanel]);

  /** The ssocookie page answered "invalid_grant" — no PlayStation session. */
  const markSessionError = useCallback((): void => {
    setSessionHint(true);
  }, []);

  /** The user retried the token capture — the hint is stale now. */
  const clearSessionHint = useCallback((): void => {
    setSessionHint(false);
  }, []);

  /**
   * Continue the PSN sign-in in a browser tab, then paste the NPSSO token in
   * the manual panel (the token capture needs our WebView).
   */
  const openExternal = useCallback(async (): Promise<void> => {
    setPanel("psnManual");
    try {
      await Linking.openURL(PSN_SIGNIN_URL);
    } catch (e) {
      logger.warn("[usePsnLinkFlow] could not open external browser for PSN:", e);
    }
  }, [setPanel]);

  const submitNpsso = useCallback(
    async (npsso: string): Promise<void> => {
      setBusy(true);
      const linkResult = await linkPsnAccount(npsso);
      if (!linkResult.ok) {
        setBusy(false);
        ToastAndroid.show(
          linkResult.message ||
            t("settings.profile.linking.psn.errorInvalidNpsso") ||
            "Could not verify the PSN token",
          ToastAndroid.LONG,
        );
        return;
      }
      const outcome = await syncPsnLibrary();
      setBusy(false);
      toastPsnOutcome(outcome);
      setPanel("choose");
    },
    [setBusy, setPanel, t, toastPsnOutcome],
  );

  const syncNow = useCallback(async (): Promise<void> => {
    setBusy(true);
    const outcome = await syncPsnLibrary();
    setBusy(false);
    toastPsnOutcome(outcome);
  }, [setBusy, toastPsnOutcome]);

  const cancel = useCallback((): void => {
    setSessionHint(false);
    setPanel("choose");
  }, [setPanel]);

  const reset = useCallback((): void => {
    setSessionHint(false);
  }, []);

  return {
    sessionHint,
    openWebView,
    markSessionError,
    clearSessionHint,
    openManual,
    openExternal,
    submitNpsso,
    syncNow,
    cancel,
    reset,
  };
}
