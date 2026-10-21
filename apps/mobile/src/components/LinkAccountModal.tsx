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

type Panel = "choose" | "psnWebView" | "psnManual";

const STEAM_REDIRECT = "gaming-zone://steam-link";
/**
 * Sony's ssocookie endpoint NEVER shows a login form — without an active
 * PlayStation session it just dumps `{"error":"invalid_grant","error_code":20}`.
 * The WebView therefore starts on the store's real sign-in page (which supports
 * 2FA etc.) and we navigate to the ssocookie URL only on demand.
 */
const PSN_COOKIE_URL = "https://ca.account.sony.com/api/v1/ssocookie";
const PSN_SIGNIN_URL = "https://store.playstation.com/en-us/pages/signin";

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

  const [panel, setPanel] = useState<Panel>("choose");
  const [busy, setBusy] = useState(false);
  const [npssoInput, setNpssoInput] = useState("");
  const [psnSessionHint, setPsnSessionHint] = useState(false);
  const [steamAccount, setSteamAccount] = useState<LinkedAccount | null>(null);
  const [psnAccount, setPsnAccount] = useState<LinkedAccount | null>(null);

  const psnWebViewRef = useRef<WebView>(null);
  /** Resolve callback for the Linking fallback after the Steam browser session. */
  const steamReturnRef = useRef<((url: string | null) => void) | null>(null);

  const styles = useThemeStyles((c) => ({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "92%",
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
    banner: {
      backgroundColor: c.surface,
      borderLeftWidth: 3,
      borderLeftColor: "#e6a23c",
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
    },
    bannerText: { color: c.text, fontSize: 13 },
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
    actionRow: { flexDirection: "row" },
    actionRowPrimary: { flex: 1 },
    webviewBox: { height: 320, borderRadius: 10, overflow: "hidden" },
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
            if (platform === "steam") setSteamAccount(data?.steamId ? data : null);
            else setPsnAccount(data ?? null);
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
    }
  }, [visible]);

  // â”€â”€ Deep-link fallback while the Steam session is external â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const sub = Linking.addEventListener("url", (event) => {
      if (event.url?.startsWith(STEAM_REDIRECT)) {
        steamReturnRef.current?.(event.url);
        steamReturnRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  /** Waits for the backend-written doc (up to 30 s) so the UI reflects it. */
  async function waitForMountedLinkedAccount(
    platform: LinkedAccountPlatform,
    timeoutMs = 30_000,
  ): Promise<void> {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    const deadline = Date.now() + timeoutMs;
    const ref = firestore()
      .collection("users")
      .doc(uid)
      .collection("linkedAccounts")
      .doc(platform);
    while (Date.now() < deadline) {
      const snap = await ref.get();
      // RNFB exposes exists() as a method (see other services).
      if (snap.exists()) return;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const runSteamSync = useCallback(async (successText: string): Promise<void> => {
    // The state snapshot can lag a fresh sign-in (doc written by the backend
    // mid-flow), so fall back to a direct read.
    let steamId = steamAccount?.steamId ?? "";
    if (!steamId) {
      const uid = auth().currentUser?.uid;
      if (uid) {
        const snap = await firestore()
          .collection("users")
          .doc(uid)
          .collection("linkedAccounts")
          .doc("steam")
          .get();
        steamId = ((snap.data() as LinkedAccount | undefined)?.steamId as string) ?? "";
      }
    }
    if (!steamId) {
      setBusy(false);
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
  }, [steamAccount?.steamId, t]);

  // â”€â”€ Steam: OpenID sign-in via browser session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openSteamSignIn = useCallback(async () => {
    setBusy(true);
    try {
      const stateResponse = await fetchLinkState("steam");
      if (!stateResponse?.startUrl) throw new Error("state fetch failed");

      let dismissed = false;
      try {
        // Deliberately dynamic â€” see lib/browser.ts for the crash rationale.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const WebBrowser = require("expo-web-browser");
        const result = await WebBrowser.openAuthSessionAsync(
          stateResponse.startUrl,
          STEAM_REDIRECT,
        );
        dismissed = (result as { type?: string })?.type === "cancel";
      } catch (browserError) {
        logger.warn(
          "[LinkAccountModal] openAuthSessionAsync unavailable â€” external browser fallback",
          browserError,
        );
        await new Promise<string | null>((resolve) => {
          // Resolve when the app is re-invoked through the deep link.
          steamReturnRef.current = (url) => resolve(url);
          Linking.openURL(stateResponse.startUrl).catch(() => resolve(null));
          // Safety timeout: never hang the modal open for more than 5 min.
          setTimeout(() => resolve(null), 5 * 60 * 1000);
        });
      }

      if (dismissed) {
        setBusy(false);
        return;
      }

      // The server wrote the linkedAccounts doc before redirecting back; give
      // it a moment to appear via the onSnapshot subscription.
      await waitForMountedLinkedAccount("steam");

      await runSteamSync(t("settings.profile.linking.messages.synced") || "Library synced");
    } catch (e) {
      logger.error("[LinkAccountModal] Steam sign-in failed", e);
      ToastAndroid.show(
        t("settings.profile.linking.steam.errorFailed") || "Steam sign-in failed",
        ToastAndroid.LONG,
      );
      setBusy(false);
    }
  }, [t, runSteamSync]);

  const handleSteamSyncNow = useCallback(async () => {
    setBusy(true);
    await runSteamSync(
      t("settings.profile.linking.messages.synced") || "Library synced",
    );
    setBusy(false);
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
      await unlinkAccount(platform);
      ToastAndroid.show(
        t("settings.profile.linking.messages.unlinked") || "Disconnected",
        ToastAndroid.SHORT,
      );
    },
    [t],
  );

  // â”€â”€ Rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const renderSteamRow = (): React.ReactNode => {
    if (!steamAccount) {
      return (
        <TouchableOpacity style={styles.primaryBtn} onPress={openSteamSignIn} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <CustomText style={styles.primaryBtnText}>
              {t("settings.profile.linking.steam.signIn") || "Sign in with Steam"}
            </CustomText>
          )}
        </TouchableOpacity>
      );
    }

    const isReauth = steamAccount.status === "reauth_required";
    return (
      <>
        {isReauth && (
          <View style={styles.banner}>
            <CustomText style={styles.bannerText}>
              {t("settings.profile.linking.psn.reauthBannerGeneric") ||
                "Connection expired â€” sign in again"}
            </CustomText>
          </View>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.actionRowPrimary]}
            onPress={handleSteamSyncNow}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <CustomText style={styles.primaryBtnText}>
                {t("settings.profile.linking.messages.syncNow") || "Sync now"}
              </CustomText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleUnlink("steam")}
            style={styles.iconBtn}
          >
            <Link2Off size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderPsnRow = (): React.ReactNode => {
    const isReauth = psnAccount?.status === "reauth_required";
    if (!psnAccount?.onlineId || isReauth) {
      return (
        <>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={openPsnWebView}
            disabled={busy}
          >
            <CustomText style={styles.primaryBtnText}>
              {isReauth
                ? t("settings.profile.linking.psn.reconnect") || "Reconnect"
                : t("settings.profile.linking.psn.signIn") || "Sign in with PlayStation"}
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, styles.mtSmall]}
            onPress={() => setPanel("psnManual")}
            disabled={busy}
          >
            <CustomText style={styles.secondaryBtnText}>
              {t("settings.profile.linking.psn.manualEntry") || "Paste token manually"}
            </CustomText>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.actionRowPrimary]}
            onPress={handlePsnSyncNow}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <CustomText style={styles.primaryBtnText}>
                {t("settings.profile.linking.messages.syncNow") || "Sync now"}
              </CustomText>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleUnlink("psn")} style={styles.iconBtn}>
            <Link2Off size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderChoose = (): React.ReactNode => {
    const steamMeta = steamAccount
      ? `${t("settings.profile.linking.messages.lastSynced")}: ${formatSyncDate(steamAccount.lastSyncedAt)}`
      : t("settings.profile.linking.messages.notLinked") || "Not connected";
    const psnMeta =
      psnAccount?.status === "reauth_required"
        ? t("settings.profile.linking.psn.reauthBanner") || "Session expired â€” tap to reconnect"
        : psnAccount?.onlineId
          ? `${t("settings.profile.linking.messages.lastSynced")}: ${formatSyncDate(psnAccount.lastSyncedAt)}`
          : t("settings.profile.linking.messages.notLinked") || "Not connected";

    return (
      <>
        <CustomText style={styles.title}>
          {t("settings.profile.linking.title") || "Sync Your Game Library"}
        </CustomText>
        <CustomText style={styles.description}>
          {t("settings.profile.linking.description") ||
            "Link your accounts to automatically import your games into your lists."}
        </CustomText>

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <SteamIcon size={26} fill={colors.text} />
          </View>
          <View style={styles.rowTextWrap}>
            <CustomText style={styles.rowName}>Steam</CustomText>
            <CustomText style={styles.rowHint}>{steamMeta}</CustomText>
          </View>
          {steamAccount && (
            <TouchableOpacity onPress={openSteamSignIn} disabled={busy} style={styles.iconBtn}>
              <Link2 size={20} color={colors.textSubtle} />
            </TouchableOpacity>
          )}
        </View>
        {renderSteamRow()}

        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <PlayStationIcon size={26} fill={colors.text} />
          </View>
          <View style={styles.rowTextWrap}>
            <CustomText style={styles.rowName}>
              {psnAccount?.onlineId || "PlayStation Network"}
            </CustomText>
            <CustomText style={styles.rowHint}>{psnMeta}</CustomText>
          </View>
          {psnAccount?.onlineId && !psnAccount.status && (
            <TouchableOpacity onPress={openPsnWebView} disabled={busy} style={styles.iconBtn}>
              <Link2 size={20} color={colors.textSubtle} />
            </TouchableOpacity>
          )}
        </View>

        {renderPsnRow()}

        <TouchableOpacity style={styles.disabledBtn} disabled>
          <Gamepad2 size={20} color={colors.textSubtle} />
          <CustomText style={styles.disabledBtnText}>
            {t("settings.profile.linking.xbox.comingSoon") || "Xbox â€” Coming Soon"}
          </CustomText>
        </TouchableOpacity>
      </>
    );
  };

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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.stretch}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>

            {panel === "choose" && renderChoose()}
            {panel === "psnWebView" && renderPsnWebView()}
            {panel === "psnManual" && renderPsnManual()}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
