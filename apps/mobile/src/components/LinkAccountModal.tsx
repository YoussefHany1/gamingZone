import React, { useCallback, useEffect, useRef, useState } from "react";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import {
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
  Linking,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { X, Link2, Link2Off, Gamepad2 } from "lucide-react-native";
import { SteamIcon, PlayStationIcon } from "@/src/components/icons/StoreIcons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type {
  LinkedAccount,
  LinkedAccountPlatform,
} from "@/src/features/settings/types";
import { fetchLinkState, linkPsnAccount } from "@/src/services/api/linkedAccountsApi";
import {
  syncSteamLibrary,
  syncPsnLibrary,
  unlinkAccount,
  type PsnSyncOutcome,
} from "@/src/features/settings/lib/platformSync";
import { logger } from "@/src/lib/logger";

export type LinkAccountModalProps = {
  visible: boolean;
  onClose: () => void;
};

type Panel = "choose" | "steamWebView" | "psnWebView" | "psnManual";

const STEAM_REDIRECT = "gaming-zone://steam-link";
/**
 * Sony's ssocookie endpoint NEVER shows a login form — without an active
 * PlayStation session it just dumps `{"error":"invalid_grant","error_code":20}`.
 * (store.playstation.com's "pages/signin" route is also dead — it renders a 404.)
 * The WebView therefore opens the session sign-in endpoint used by every PSN
 * library tool: it lands on the real `my.account.sony.com` login form (2FA
 * supported) and, post-login, bounces through to the ssocookie page where the
 * injected probe reads the NPSSO automatically.
 */
const PSN_COOKIE_URL = "https://ca.account.sony.com/api/v1/ssocookie";
const PSN_SIGNIN_URL =
  "https://web.np.playstation.com/api/session/v1/signin?redirect_uri=https%3A%2F%2Fio.playstation.com%2Fcentral%2Fauth%2Flogin%3FpostSignInURL%3Dhttps%253A%252F%252Fca.account.sony.com%252Fapi%252Fv1%252Fssocookie";

/**
 * A real mobile-Chrome user agent â€” the default RN WebView agent string is a
 * trivially detectable "bot" signature which can trigger Sony's FunCaptcha or
 * outright blocks inside embedded sessions.
 */
const PSN_WEBVIEW_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

/** Probes the current page for the ssocookie JSON (token or "not signed in"). */
function psnInjectedJs(): string {
  return `
    (function () {
      if (window.__gzonePsnProbe) return;
      window.__gzonePsnProbe = true;
      var tries = 0;
      var read = function () {
        try {
          var text = document.body ? document.body.innerText : "";
          if (text.indexOf("npsso") !== -1) {
            var json = JSON.parse(text);
            if (json && json.npsso) {
              window.__gzonePsnProbe = false;
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "npsso", npsso: json.npsso })
              );
              return;
            }
          }
          if (text.indexOf("invalid_grant") !== -1) {
            window.__gzonePsnProbe = false;
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: "psn_session_error" })
            );
            return;
          }
          if (tries < 40) { tries++; setTimeout(read, 500); }
        } catch (e) { /* page may not be ready */ }
      };
      read();
    })();
    true;
  `;
}

function formatSyncDate(ts?: number | null): string {
  if (!ts) return "â€”";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "â€”";
  }
}

export default function LinkAccountModal({ visible, onClose }: LinkAccountModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const window = useWindowDimensions();

  const [panel, setPanel] = useState<Panel>("choose");
  const [busy, setBusy] = useState(false);
  const [npssoInput, setNpssoInput] = useState("");
  const [psnSessionHint, setPsnSessionHint] = useState(false);
  /** Steam OpenID start URL while the WebView flow is active. */
  const [steamStartUrl, setSteamStartUrl] = useState<string | null>(null);
  const [steamAccount, setSteamAccount] = useState<LinkedAccount | null>(null);
  const [psnAccount, setPsnAccount] = useState<LinkedAccount | null>(null);

  const psnWebViewRef = useRef<WebView>(null);
  const steamWebViewRef = useRef<WebView>(null);
  /** Guards the at-most-once handling of the Steam callback redirect. */
  const steamCallbackLock = useRef(false);

  const styles = useThemeStyles((c) => ({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "92%",
      // Tablets / wide screens: don't let the modal stretch edge to edge.
      maxWidth: 640,
      backgroundColor: c.background,
      padding: 20,
      borderRadius: 16,
      elevation: 5,
      maxHeight: "88%",
    },
    title: {
      color: c.text,
      fontSize: 19,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 6,
    },
    description: {
      color: c.textSubtle,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 14,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    rowSpinner: { marginRight: 6, marginLeft: 4 },
    manualLink: { alignSelf: "center", padding: 6, marginBottom: 8 },
    manualLinkText: {
      color: c.textSubtle,
      fontSize: 12,
      textDecorationLine: "underline",
    },
    rowIcon: { marginRight: 10 },
    rowTextWrap: { flex: 1 },
    rowName: { color: c.text, fontSize: 15, fontWeight: "600" },
    rowHint: { color: c.textSubtle, fontSize: 12 },
    primaryBtn: {
      backgroundColor: c.accent,
      padding: 12,
      borderRadius: 10,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    primaryBtnText: { color: c.onAccent, fontWeight: "bold", fontSize: 15 },
    secondaryBtn: {
      padding: 11,
      borderRadius: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryBtnText: { color: c.text, fontWeight: "600", fontSize: 14 },
    disabledBtn: {
      padding: 12,
      borderRadius: 10,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      opacity: 0.45,
    },
    disabledBtnText: {
      color: c.textSubtle,
      fontWeight: "600",
      fontSize: 14,
      marginLeft: 8,
    },
    iconBtn: { padding: 8, marginLeft: 2 },
    webviewBox: {
      height: Math.min(320, Math.round(window.height * 0.42)),
      borderRadius: 10,
      overflow: "hidden",
    },
    /** Shrinks to the modal height cap and becomes scrollable only when the
     * panel content cannot fit (short panels stay exactly as tall as needed). */
    panelScroll: { flexGrow: 0, flexShrink: 1 },
    panelContent: { paddingBottom: 4 },
    mtSmall: { marginTop: 8 },
    mtMedium: { marginTop: 10 },
    mbMedium: { marginBottom: 12 },
    inputWrap: { backgroundColor: c.surface, color: c.text, marginBottom: 10 },
    closeBtn: { alignSelf: "flex-end" },
    stretch: { flex: 1 },
  }));

  // â”€â”€ Live linkedAccounts subscription while open â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!visible) return;
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const subs: Array<() => void> = [];
    for (const platform of ["steam", "psn"] as const) {
      const sub = firestore()
        .collection("users")
        .doc(uid)
        .collection("linkedAccounts")
        .doc(platform)
        .onSnapshot(
          (snap) => {
            const data = (snap.data() ?? null) as LinkedAccount | null;
            // A doc keeps its identifiers after unlinking (status: "unlinked")
            // — it must render as "not connected" from the user's view.
            const connected = data != null && data.status !== "unlinked";
            if (platform === "steam") {
              setSteamAccount(connected && data?.steamId ? data : null);
            } else {
              setPsnAccount(connected && data?.onlineId ? data : null);
            }
          },
          (error) => {
            // e.g. rules not deployed yet — degrade to "not connected".
            logger.warn("[LinkAccountModal] linkedAccounts listener error:", error);
          },
        );
      subs.push(sub);
    }
    return () => subs.forEach((fn) => fn());
  }, [visible]);

  // â”€â”€ Reset transient state when the modal closes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!visible) {
      setPanel("choose");
      setNpssoInput("");
      setBusy(false);
      setSteamStartUrl(null);
      setPsnSessionHint(false);
    }
  }, [visible]);

  /**
   * Waits for the backend-written doc so the UI reflects it. Never throws:
   * a Firestore hiccup must not abort the sign-in flow — the caller falls
   * back to the Steam ID carried by the callback URL.
   */
  async function waitForMountedLinkedAccount(
    platform: LinkedAccountPlatform,
    timeoutMs = 15_000,
  ): Promise<boolean> {
    const uid = auth().currentUser?.uid;
    if (!uid) return false;
    const deadline = Date.now() + timeoutMs;
    const ref = firestore()
      .collection("users")
      .doc(uid)
      .collection("linkedAccounts")
      .doc(platform);
    while (Date.now() < deadline) {
      try {
        const snap = await ref.get();
        // RNFB exposes exists() as a method (see other services).
        if (snap.exists()) return true;
      } catch (e) {
        logger.warn(`[LinkAccountModal] linkedAccounts/${platform} read failed:`, e);
        return false;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  }

  const runSteamSync = useCallback(
    async (successText: string, explicitSteamId?: string | null): Promise<void> => {
      // Priority: the id carried by the OpenID callback → the live snapshot →
      // a direct read (the snapshot can lag a fresh sign-in).
      let steamId = explicitSteamId || steamAccount?.steamId || "";
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
            logger.warn("[LinkAccountModal] could not read the linked Steam account:", e);
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
      switch (outcome) {
        case "ok":
          ToastAndroid.show(successText, ToastAndroid.SHORT);
          break;
        case "private":
          ToastAndroid.show(
            t("settings.profile.steam.errors.privateProfile") || "Your Steam profile is private",
            ToastAndroid.LONG,
          );
          break;
        case "empty":
          ToastAndroid.show(
            t("settings.profile.linking.messages.empty") || "No games found",
            ToastAndroid.SHORT,
          );
          break;
        default:
          ToastAndroid.show(
            t("settings.profile.linking.messages.syncFailed") || "Sync failed",
            ToastAndroid.SHORT,
          );
      }
    },
    [steamAccount?.steamId, t],
  );

  // â”€â”€ Steam: OpenID sign-in inside the WebView â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** Opens the Steam OpenID login page as an in-app WebView panel. */
  const openSteamSignIn = useCallback(async () => {
    try {
      const result = await fetchLinkState("steam");
      if (!result.ok || !result.data?.startUrl) {
        throw new Error(
          result.ok ? "state fetch failed" : `state fetch failed (HTTP ${result.status ?? "?"})`,
        );
      }
      steamCallbackLock.current = false;
      setSteamStartUrl(result.data.startUrl);
      setPanel("steamWebView");
    } catch (e) {
      logger.error("[LinkAccountModal] Steam sign-in failed", e);
      ToastAndroid.show(
        t("settings.profile.linking.steam.errorFailed") || "Steam sign-in failed",
        ToastAndroid.LONG,
      );
    }
  }, [t]);

  /**
   * The backend callback 302-redirects to `gaming-zone://steam-link?...`.
   * Inside the WebView that deep link never reaches the OS — we intercept it
   * (onShouldStartLoadWithRequest / onNavigationStateChange), parse the
   * outcome, and run the post-link library sync.
   */
  const handleSteamCallbackUrl = useCallback(
    async (url: string): Promise<void> => {
      if (steamCallbackLock.current) return;
      steamCallbackLock.current = true;
      setSteamStartUrl(null);
      setPanel("choose");

      const query = url.split("?")[1] ?? "";
      const queryParam = (name: string) =>
        new RegExp(`(?:^|&)${name}=([^&]*)`).exec(query)?.[1] ?? "";

      try {
        if (queryParam("status") === "success") {
          // The server wrote the linkedAccounts doc before redirecting; give it
          // a moment to appear via the onSnapshot subscription. The Steam ID
          // in the callback lets the sync run even if that read fails.
          setBusy(true);
          await waitForMountedLinkedAccount("steam");
          const steamIdParam = queryParam("steamId");
          await runSteamSync(
            t("settings.profile.linking.messages.synced") || "Library synced",
            steamIdParam ? decodeURIComponent(steamIdParam) : null,
          );
          return;
        }

        logger.warn(
          "[LinkAccountModal] Steam sign-in rejected:", queryParam("reason") || "unknown",
        );
        ToastAndroid.show(
          t("settings.profile.linking.steam.errorFailed") || "Steam sign-in failed",
          ToastAndroid.LONG,
        );
      } catch (e) {
        logger.error("[LinkAccountModal] Steam callback handling failed:", e);
        setBusy(false);
        ToastAndroid.show(
          t("settings.profile.linking.messages.syncFailed") || "Sync failed",
          ToastAndroid.SHORT,
        );
      }
    },
    [runSteamSync, t],
  );

  /**
   * Continues the OpenID sign-in in the system browser. The backend's
   * `gaming-zone://steam-link` redirect is delivered as a deep link into the
   * app and re-enters the exact same handler the WebView intercept uses.
   */
  const openSteamExternal = useCallback(async () => {
    if (!steamStartUrl) return;
    const url = steamStartUrl;
    steamCallbackLock.current = false;
    setSteamStartUrl(null);
    setPanel("choose");
    try {
      await Linking.openURL(url);
      ToastAndroid.show(
        t("settings.profile.linking.steam.browserHint") ||
          "Finish signing in in your browser - we sync automatically afterwards.",
        ToastAndroid.LONG,
      );
    } catch (e) {
      logger.warn("[LinkAccountModal] could not open external browser for Steam:", e);
      ToastAndroid.show(
        t("settings.profile.linking.steam.errorFailed") || "Steam sign-in failed",
        ToastAndroid.LONG,
      );
    }
  }, [steamStartUrl, t]);

  /**
   * Deep-link return path for the external browser-tab flow. The app is
   * either already running (the "url" event) or cold-started by the link
   * (getInitialURL) - both have to reach the same handler.
   */
  useEffect(() => {
    const sub = Linking.addEventListener("url", (event) => {
      if (event.url?.startsWith(STEAM_REDIRECT)) void handleSteamCallbackUrl(event.url);
    });
    Linking.getInitialURL()
      .then((initial) => {
        if (initial?.startsWith(STEAM_REDIRECT)) void handleSteamCallbackUrl(initial);
      })
      .catch(() => {
        /* no launch URL - nothing to recover */
      });
    return () => sub.remove();
  }, [handleSteamCallbackUrl]);

  /**
   * Continue the PSN sign-in in a browser tab, then paste the NPSSO token in
   * the manual panel (the token capture needs our WebView).
   */
  const openPsnExternal = useCallback(async () => {
    setPanel("psnManual");
    try {
      await Linking.openURL(PSN_SIGNIN_URL);
    } catch (e) {
      logger.warn("[LinkAccountModal] could not open external browser for PSN:", e);
    }
  }, []);

  const handleSteamSyncNow = useCallback(async () => {
    setBusy(true);
    // `runSteamSync` clears `busy` in every branch.
    await runSteamSync(t("settings.profile.linking.messages.synced") || "Library synced");
  }, [runSteamSync, t]);

  // â”€â”€ PSN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toastPsnOutcome = useCallback(
    (outcome: PsnSyncOutcome) => {
      switch (outcome) {
        case "ok":
          ToastAndroid.show(
            t("settings.profile.linking.messages.synced") || "Library synced",
            ToastAndroid.SHORT,
          );
          break;
        case "empty":
          ToastAndroid.show(
            t("settings.profile.linking.psn.empty") || "No played games found",
            ToastAndroid.SHORT,
          );
          break;
        case "reauth_required":
          // The backend flipped the account to reauth_required â€” the banner in
          // this modal shows the reconnect prompt; never an error toast storm.
          ToastAndroid.show(
            t("settings.profile.linking.psn.reauthBannerFormal") ||
              "PlayStation session expired â€” reconnect to resume syncing",
            ToastAndroid.LONG,
          );
          break;
        default:
          ToastAndroid.show(
            t("settings.profile.linking.messages.syncFailed") || "Sync failed",
            ToastAndroid.SHORT,
          );
      }
    },
    [t],
  );

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
    [t, toastPsnOutcome],
  );

  const handlePsnMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          npsso?: string;
        };
        // We navigated to ssocookie without an active PlayStation session —
        // that page shows the raw error JSON instead of a login form, so go
        // back to sign-in and explain what to do.
        if (payload?.type === "psn_session_error") {
          setPsnSessionHint(true);
          psnWebViewRef.current?.injectJavaScript(
            `window.location.href = ${JSON.stringify(PSN_SIGNIN_URL)}; true;`,
          );
          return;
        }
        if (payload?.type !== "npsso" || !payload.npsso) return;
        // Close the WebView immediately â€” the token must not linger there.
        setPanel("choose");
        setPsnSessionHint(false);
        setBusy(true);
        await submitNpsso(payload.npsso);
      } catch {
        // Not the npsso payload â€” other page messages are ignored.
      }
    },
    [submitNpsso],
  );

  /** Opens the PSN sign-in WebView with a clean hint state. */
  const openPsnWebView = useCallback(() => {
    setPsnSessionHint(false);
    setPanel("psnWebView");
  }, []);

  /** Re-probes after every navigation â€” injectedJavaScript only runs once. */
  const handlePsnLoadEnd = useCallback(() => {
    psnWebViewRef.current?.injectJavaScript(psnInjectedJs());
  }, []);

  /** Navigates the WebView to the ssocookie endpoint to collect the NPSSO. */
  const handleGrabNpsso = useCallback(() => {
    setPsnSessionHint(false);
    psnWebViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(PSN_COOKIE_URL)}; true;`,
    );
  }, []);

  const handlePsnSyncNow = useCallback(async () => {
    setBusy(true);
    const outcome = await syncPsnLibrary();
    setBusy(false);
    toastPsnOutcome(outcome);
  }, [toastPsnOutcome]);

  const handlePsnManualSubmit = useCallback(async () => {
    if (!npssoInput.trim()) return;
    await submitNpsso(npssoInput);
    setNpssoInput("");
  }, [npssoInput, submitNpsso]);

  const handleUnlink = useCallback(
    async (platform: LinkedAccountPlatform) => {
      // Optimistic: flip the row to "not connected" immediately — the
      // snapshot listener may take a round-trip, and the next snapshot event
      // (carrying status "unlinked") maps back to the same cleared state.
      if (platform === "steam") setSteamAccount(null);
      else setPsnAccount(null);
      await unlinkAccount(platform);
      ToastAndroid.show(
        t("settings.profile.linking.messages.unlinked") || "Disconnected",
        ToastAndroid.SHORT,
      );
    },
    [t],
  );

  /** Shared row renderer: tapping a connected row re-syncs; an unlinked or
   * reauth-required row walks the user through the sign-in flow again. */
  const renderPlatformRow = (
    icon: React.ReactNode,
    name: string,
    meta: string,
    onPress: () => void,
    onRelink?: () => void,
    onUnlink?: () => void,
  ): React.ReactNode => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowTextWrap}>
        <CustomText style={styles.rowName}>{name}</CustomText>
        <CustomText style={styles.rowHint} numberOfLines={1}>
          {meta}
        </CustomText>
      </View>
      {busy && (
        <ActivityIndicator size="small" color={colors.textSubtle} style={styles.rowSpinner} />
      )}
      {onRelink && !busy && (
        <TouchableOpacity onPress={onRelink} style={styles.iconBtn}>
          <Link2 size={20} color={colors.textSubtle} />
        </TouchableOpacity>
      )}
      {onUnlink && !busy && (
        <TouchableOpacity onPress={onUnlink} style={styles.iconBtn}>
          <Link2Off size={20} color={colors.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // â”€â”€ Rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // ── Choose panel ────────────────────────────────────────────────────────────

  const renderChoose = (): React.ReactNode => {
    const metaFor = (account: LinkedAccount | null): string => {
      if (!account) {
        return t("settings.profile.linking.messages.notLinked") || "Not connected";
      }
      if (account.status === "reauth_required") {
        return t("settings.profile.linking.psn.reauthBanner") || "Session expired â€” tap to reconnect";
      }
      return `${t("settings.profile.linking.messages.lastSynced")}: ${formatSyncDate(account.lastSyncedAt)}`;
    };
    const steamMeta = metaFor(steamAccount);
    const psnMeta = metaFor(psnAccount?.onlineId ? psnAccount : null);

    // Pressing a row runs the full pipeline for that platform: not linked or
    // reauth-required → sign-in flow → link → auto-sync; connected → sync now.
    const steamPress = () => {
      if (!steamAccount || steamAccount.status === "reauth_required") void openSteamSignIn();
      else void handleSteamSyncNow();
    };
    const psnPress = () => {
      if (!psnAccount?.onlineId || psnAccount.status === "reauth_required") openPsnWebView();
      else void handlePsnSyncNow();
    };

    return (
      <>
        <CustomText style={styles.title}>
          {t("settings.profile.linking.title") || "Sync Your Game Library"}
        </CustomText>
        <CustomText style={styles.description}>
          {t("settings.profile.linking.description") ||
            "Link your accounts to automatically import your games into your lists."}
        </CustomText>

        {renderPlatformRow(
          <SteamIcon size={26} fill={colors.text} />,
          "Steam",
          steamMeta,
          steamPress,
          // Re-authenticate without disconnecting (fresh OpenID session).
          steamAccount ? () => void openSteamSignIn() : undefined,
          steamAccount ? () => void handleUnlink("steam") : undefined,
        )}

        {renderPlatformRow(
          <PlayStationIcon size={26} fill={colors.text} />,
          psnAccount?.onlineId || "PlayStation Network",
          psnMeta,
          psnPress,
          psnAccount?.onlineId ? openPsnWebView : undefined,
          psnAccount?.onlineId ? () => void handleUnlink("psn") : undefined,
        )}

        {/* NPSSO fallback kept reachable, but out of the main flow. */}
        <TouchableOpacity
          onPress={() => setPanel("psnManual")}
          disabled={busy}
          style={styles.manualLink}
        >
          <CustomText style={styles.manualLinkText}>
            {t("settings.profile.linking.psn.manualEntry") ||
              "Paste a PlayStation NPSSO token manually"}
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.disabledBtn} disabled>
          <Gamepad2 size={20} color={colors.textSubtle} />
          <CustomText style={styles.disabledBtnText}>
            {t("settings.profile.linking.xbox.comingSoon") || "Xbox â€” Coming Soon"}
          </CustomText>
        </TouchableOpacity>
      </>
    );
  };

  const renderSteamWebView = (): React.ReactNode => (
    <>
      <CustomText style={styles.title}>
        {t("settings.profile.linking.steam.signIn") || "Sign in with Steam"}
      </CustomText>
      <CustomText style={styles.description}>
        {t("settings.profile.linking.steam.webviewHint") ||
          "Sign in with your Steam account above. Once Steam confirms, this window closes and your library syncs automatically."}
      </CustomText>
      <View style={styles.webviewBox}>
        <WebView
          ref={steamWebViewRef}
          source={{ uri: steamStartUrl ?? "about:blank" }}
          onShouldStartLoadWithRequest={(request) => {            // The backend's final redirect lands on our deep-link scheme —
            // that never resolves inside a WebView, so intercept it here.
            if (request.url.startsWith(STEAM_REDIRECT)) {
              void handleSteamCallbackUrl(request.url);
              return false;
            }
            return true;
          }}
          onNavigationStateChange={(navState) => {
            if (navState.url.startsWith(STEAM_REDIRECT)) {
              void handleSteamCallbackUrl(navState.url);
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          startInLoadingState
        />
      </View>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={() => void openSteamExternal()}
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.steam.openBrowser") || "Open in a browser tab instead"}
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={() => {
          steamCallbackLock.current = false;
          setSteamStartUrl(null);
          setPanel("choose");
        }}
      >
        <CustomText style={styles.secondaryBtnText}>{t("common.back") || "Back"}</CustomText>
      </TouchableOpacity>
    </>
  );

  const renderPsnWebView = (): React.ReactNode => (
    <>
      <CustomText style={styles.title}>
        {t("settings.profile.linking.psn.webviewTitle") || "Sign in on PlayStation.com"}
      </CustomText>
      <CustomText style={styles.description}>
        {psnSessionHint
          ? t("settings.profile.linking.psn.sessionHint") ||
            "You are not signed in yet. Complete the sign-in above (including 2-factor verification), then tap “Get NPSSO”."
          : t("settings.profile.linking.psn.webviewHint") ||
            "Log into your PlayStation account above. Then tap “Get NPSSO” — we pick up your token automatically and close this window."}
      </CustomText>
      <View style={styles.webviewBox}>
        <WebView
          ref={psnWebViewRef}
          source={{ uri: PSN_SIGNIN_URL }}
          userAgent={PSN_WEBVIEW_UA}
          onMessage={handlePsnMessage}
          injectedJavaScript={psnInjectedJs()}
          onLoadEnd={handlePsnLoadEnd}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, styles.mtSmall]}
        onPress={handleGrabNpsso}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <CustomText style={styles.primaryBtnText}>
            {t("settings.profile.linking.psn.grabToken") || "Get NPSSO"}
          </CustomText>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={() => void openPsnExternal()}
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.psn.openBrowser") ||
            "Continue in a browser tab instead"}
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={() => setPanel("psnManual")}
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.psn.manualEntry") || "Paste token manually"}
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={() => setPanel("choose")}
      >
        <CustomText style={styles.secondaryBtnText}>{t("common.back") || "Back"}</CustomText>
      </TouchableOpacity>
    </>
  );

  const renderPsnManual = (): React.ReactNode => (
    <>
      <CustomText style={styles.title}>
        {t("settings.profile.linking.psn.manualTitle") || "Connect PlayStation"}
      </CustomText>
      <CustomText style={styles.description}>
        {t("settings.profile.linking.psn.manualInstructions") ||
          "Open the page below, sign in if needed, copy the NPSSO token shown there, and paste it here."}
      </CustomText>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mbMedium]}
        onPress={() =>
          Linking.openURL(PSN_COOKIE_URL).catch(() => {
            /* ignore */
          })
        }
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.psn.openCookiePage") || "Open NPSSO page"}
        </CustomText>
      </TouchableOpacity>
      <CustomTextInput
        style={styles.inputWrap}
        placeholder="NPSSO"
        placeholderTextColor={colors.textSubtle}
        value={npssoInput}
        onChangeText={setNpssoInput}
        autoCapitalize="none"
        autoCorrect={false}
        selectTextOnFocus
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={handlePsnManualSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <CustomText style={styles.primaryBtnText}>
            {t("settings.profile.linking.psn.connect") || "Connect"}
          </CustomText>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={() => setPanel("choose")}
      >
        <CustomText style={styles.secondaryBtnText}>{t("common.back") || "Back"}</CustomText>
      </TouchableOpacity>
    </>
  );

  /** Android hardware back: step out of a sub-panel first, close modal last. */
  const handleBackButton = useCallback(() => {
    if (panel === "steamWebView") {
      steamCallbackLock.current = false;
      setSteamStartUrl(null);
      setPanel("choose");
    } else if (panel === "psnWebView" || panel === "psnManual") {
      setPanel("choose");
    } else {
      onClose();
    }
  }, [panel, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleBackButton}
    >
      <KeyboardAvoidingView
        style={styles.stretch}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>

            {/* Small screens: every panel is reachable by scrolling. The
                nested-scroll flag lets the embedded sign-in WebViews and this
                outer scroll cooperate instead of fighting for gestures. */}
            <ScrollView
              style={styles.panelScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelContent}
            >
              {panel === "choose" && renderChoose()}
              {panel === "steamWebView" && steamStartUrl && renderSteamWebView()}
              {panel === "psnWebView" && renderPsnWebView()}
              {panel === "psnManual" && renderPsnManual()}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
