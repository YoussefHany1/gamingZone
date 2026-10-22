/**
 * XboxSignInPanel — the Microsoft sign-in screen.
 *
 * The backend callback 302-redirects to `gaming-zone://xbox-link?...`.
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
import { MOBILE_CHROME_UA, XBOX_REDIRECT } from "@/src/features/linking/lib/constants";

export type XboxSignInPanelProps = {
  /** The backend `/xbox/authorize` URL (null while it is still being fetched). */
  startUrl: string | null;
  onCallbackUrl: (url: string) => void;
  onOpenBrowser: () => void;
  onBack?: () => void;
};

function XboxSignInPanel({
  startUrl,
  onCallbackUrl,
  onOpenBrowser,
  onBack,
}: XboxSignInPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useLinkPanelStyles();

  const isRedirect = (url: string): boolean => url.startsWith(XBOX_REDIRECT);

  return (
    <>
      <CustomText style={styles.title}>
        {t("settings.profile.linking.xbox.signIn") || "Sign in with Microsoft"}
      </CustomText>
      <CustomText style={styles.description}>
        {t("settings.profile.linking.xbox.webviewHint") ||
          "Sign in with your Microsoft account above. Once Microsoft confirms, this window closes and your library syncs automatically."}
      </CustomText>
      <View style={styles.webviewBox}>
        <WebView
          source={{ uri: startUrl ?? "about:blank" }}
          userAgent={MOBILE_CHROME_UA}
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
          {t("settings.profile.linking.xbox.openBrowser") || "Open in a browser tab instead"}
        </CustomText>
      </TouchableOpacity>
    </>
  );
}

XboxSignInPanel.displayName = "XboxSignInPanel";

export default memo(XboxSignInPanel);
