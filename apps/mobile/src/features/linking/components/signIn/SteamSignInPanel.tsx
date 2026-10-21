/**
 * SteamSignInPanel — the Steam OpenID sign-in screen.
 *
 * The backend callback 302-redirects to `gaming-zone://steam-link?...`.
 * Inside the WebView that deep link never reaches the OS — we intercept it
 * (onShouldStartLoadWithRequest / onNavigationStateChange) and hand it to the
 * flow, which parses the outcome and runs the post-link library sync.
 */
import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useLinkPanelStyles } from "@/src/features/linking/components/useLinkPanelStyles";
import { STEAM_REDIRECT } from "@/src/features/linking/lib/constants";

export type SteamSignInPanelProps = {
  /** The Steam OpenID URL to open (null while it is still being fetched). */
  startUrl: string | null;
  onCallbackUrl: (url: string) => void;
  onOpenBrowser: () => void;
  onBack: () => void;
};

function SteamSignInPanel({
  startUrl,
  onCallbackUrl,
  onOpenBrowser,
  onBack,
}: SteamSignInPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useLinkPanelStyles();

  const isRedirect = (url: string): boolean => url.startsWith(STEAM_REDIRECT);

  return (
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
          source={{ uri: startUrl ?? "about:blank" }}
          onShouldStartLoadWithRequest={(request) => {
            // The backend's final redirect lands on our deep-link scheme —
            // that never resolves inside a WebView, so intercept it here.
            if (isRedirect(request.url)) {
              onCallbackUrl(request.url);
              return false;
            }
            return true;
          }}
          onNavigationStateChange={(navState) => {
            if (isRedirect(navState.url)) {
              onCallbackUrl(navState.url);
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
        onPress={onOpenBrowser}
      >
        <CustomText style={styles.secondaryBtnText}>
          {t("settings.profile.linking.steam.openBrowser") || "Open in a browser tab instead"}
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

SteamSignInPanel.displayName = "SteamSignInPanel";

export default memo(SteamSignInPanel);
