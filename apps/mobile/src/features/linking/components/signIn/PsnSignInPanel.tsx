/**
 * PsnSignInPanel — the PlayStation sign-in screen.
 *
 * Sony's ssocookie endpoint never renders a login form, so the panel drives
 * the WebView: it injects the probe script after every navigation, reacts to
 * the "no session" answer by sending the user back to the sign-in page, and
 * navigates to the cookie endpoint when "Get NPSSO" is tapped.
 *
 * The WebView mechanics live here; the business logic (linking + syncing)
 * lives in `usePsnLinkFlow`.
 */
import React, { memo, useCallback, useRef } from "react";
import { TouchableOpacity, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useLinkPanelStyles } from "@/src/features/linking/components/useLinkPanelStyles";
import { psnInjectedJs } from "@/src/features/linking/lib/psnProbe";
import {
  MOBILE_CHROME_UA,
  PSN_COOKIE_URL,
  PSN_SIGNIN_URL,
} from "@/src/features/linking/lib/constants";

export type PsnSignInPanelProps = {
  /** True when the WebView found no PlayStation session to work with. */
  sessionHint: boolean;
  busy: boolean;
  /** The NPSSO token was captured by the probe. */
  onNpsso: (npsso: string) => void;
  /** The WebView found no active PlayStation session. */
  onSessionError: () => void;
  /** The user retried the token capture. */
  onClearSessionHint: () => void;
  onOpenBrowser: () => void;
  onManualEntry: () => void;
  onBack: () => void;
};

function PsnSignInPanel({
  sessionHint,
  busy,
  onNpsso,
  onSessionError,
  onClearSessionHint,
  onOpenBrowser,
  onManualEntry,
  onBack,
}: PsnSignInPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useLinkPanelStyles();
  const webViewRef = useRef<WebView>(null);

  /** Navigates the WebView to a URL. */
  const navigateTo = useCallback((url: string): void => {
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(url)}; true;`,
    );
  }, []);

  /** Re-probes after every navigation — injectedJavaScript only runs once. */
  const handleLoadEnd = useCallback((): void => {
    webViewRef.current?.injectJavaScript(psnInjectedJs());
  }, []);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }): void => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          npsso?: string;
        };
        // We navigated to ssocookie without an active PlayStation session —
        // that page shows the raw error JSON instead of a login form, so go
        // back to sign-in and explain what to do.
        if (payload?.type === "psn_session_error") {
          onSessionError();
          navigateTo(PSN_SIGNIN_URL);
          return;
        }
        if (payload?.type !== "npsso" || !payload.npsso) return;
        onNpsso(payload.npsso);
      } catch {
        // Not the npsso payload — other page messages are ignored.
      }
    },
    [navigateTo, onNpsso, onSessionError],
  );

  /** Navigates the WebView to the ssocookie endpoint to collect the NPSSO. */
  const handleGrabNpsso = useCallback((): void => {
    onClearSessionHint();
    navigateTo(PSN_COOKIE_URL);
  }, [navigateTo, onClearSessionHint]);

  return (
    <>
      <CustomText style={styles.title}>
        {t("settings.profile.linking.psn.webviewTitle") || "Sign in on PlayStation.com"}
      </CustomText>
      <CustomText style={styles.description}>
        {sessionHint
          ? t("settings.profile.linking.psn.sessionHint") ||
            "You are not signed in yet. Complete the sign-in above (including 2-factor verification), then tap “Get NPSSO”."
          : t("settings.profile.linking.psn.webviewHint") ||
            "Log into your PlayStation account above. Then tap “Get NPSSO” — we pick up your token automatically and close this window."}
      </CustomText>
      <View style={styles.webviewBox}>
        <WebView
          ref={webViewRef}
          source={{ uri: PSN_SIGNIN_URL }}
          userAgent={MOBILE_CHROME_UA}
          onMessage={handleMessage}
          injectedJavaScript={psnInjectedJs()}
          onLoadEnd={handleLoadEnd}
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
        onPress={onOpenBrowser}
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.psn.openBrowser") ||
            "Continue in a browser tab instead"}
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={onManualEntry}
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.psn.manualEntry") || "Paste token manually"}
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, styles.mtSmall]}
        onPress={onBack}
      >
        <CustomText style={styles.secondaryBtnText}>{t("common.back") || "Back"}</CustomText>
      </TouchableOpacity>
    </>
  );
}

PsnSignInPanel.displayName = "PsnSignInPanel";

export default memo(PsnSignInPanel);
