/**
 * LinkAccountModal — the "Connected Apps" modal.
 *
 * The modal itself only owns the shell (chrome, the active panel and the busy
 * flag). Everything else lives in dedicated modules:
 *  - `hooks/useLinkedAccounts` — the live linked-account snapshots.
 *  - `hooks/useSteamLinkFlow` / `usePsnLinkFlow` / `useXboxLinkFlow` — the
 *    per-platform sign-in and sync pipelines.
 *  - `hooks/useLinkDeepLink` — routes the linking deep links to those flows.
 *  - `components/*` — one component per panel.
 *
 * The three sign-in screens are loaded lazily, so `react-native-webview` only
 * reaches the bundle once the user actually starts a sign-in.
 */
import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  I18nManager,
} from "react-native";
import { X, ArrowLeft, ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useLinkedAccounts } from "@/src/features/linking/hooks/useLinkedAccounts";
import { useLinkDeepLink } from "@/src/features/linking/hooks/useLinkDeepLink";
import { usePsnLinkFlow } from "@/src/features/linking/hooks/usePsnLinkFlow";
import { useSteamLinkFlow } from "@/src/features/linking/hooks/useSteamLinkFlow";
import { useXboxLinkFlow } from "@/src/features/linking/hooks/useXboxLinkFlow";
import ChoosePlatformPanel from "@/src/features/linking/components/ChoosePlatformPanel";
import PsnManualPanel from "@/src/features/linking/components/PsnManualPanel";
import { useLinkPanelStyles } from "@/src/features/linking/components/useLinkPanelStyles";
import type { LinkPanel } from "@/src/features/linking/lib/types";

// The sign-in screens live in one lazily loaded chunk: it keeps
// `react-native-webview` out of the startup bundle and loads it only once.
// The specifier is relative on purpose — Metro resolves a dynamic import
// through the same pipeline as a static one, but a relative path needs no
// alias rewriting and therefore cannot break.
const SteamSignInPanel = lazy(() =>
  import("./signIn").then((module) => ({
    default: module.SteamSignInPanel,
  })),
);
const PsnSignInPanel = lazy(() =>
  import("./signIn").then((module) => ({
    default: module.PsnSignInPanel,
  })),
);
const XboxSignInPanel = lazy(() =>
  import("./signIn").then((module) => ({
    default: module.XboxSignInPanel,
  })),
);

export type LinkAccountModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Shown while the lazily loaded sign-in chunk is being fetched. */
function PanelLoading(): React.ReactElement {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: { padding: 32, alignItems: "center", backgroundColor: c.background },
  }));
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.textSubtle} />
    </View>
  );
}

/**
 * Shown when the sign-in screen could not be loaded at all (a failed chunk
 * fetch). The user still gets back to the platform list instead of staring at
 * an empty modal.
 */
function PanelError({ onBack }: { onBack: () => void }): React.ReactElement {
  const { t } = useTranslation();
  const styles = useLinkPanelStyles();
  return (
    <>
      <CustomText style={styles.title}>
        {t("common.somethingWentWrong") || "Something went wrong"}
      </CustomText>
      <TouchableOpacity style={[styles.secondaryBtn, styles.mtSmall]} onPress={onBack}>
        <CustomText style={styles.secondaryBtnText}>{t("common.back") || "Back"}</CustomText>
      </TouchableOpacity>
    </>
  );
}

export default function LinkAccountModal({
  visible,
  onClose,
}: LinkAccountModalProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const isRtl = i18n.language === "ar" || I18nManager.isRTL;

  const [panel, setPanel] = useState<LinkPanel>("choose");
  const [busy, setBusy] = useState(false);
  const isSubPanel = panel !== "choose";

  const { steamAccount, psnAccount, xboxAccount, waitForMounted, unlink } =
    useLinkedAccounts(visible);

  const {
    startUrl: steamStartUrl,
    openSignIn: openSteamSignIn,
    handleCallbackUrl: handleSteamCallbackUrl,
    openExternal: openSteamExternal,
    syncNow: syncSteamNow,
    cancel: cancelSteam,
    reset: resetSteam,
  } = useSteamLinkFlow({
    account: steamAccount,
    setBusy,
    setPanel,
    waitForMounted,
  });

  const {
    sessionHint: psnSessionHint,
    openWebView: openPsnWebView,
    markSessionError: markPsnSessionError,
    clearSessionHint: clearPsnSessionHint,
    openManual: openPsnManual,
    openExternal: openPsnExternal,
    submitNpsso: submitPsnNpsso,
    syncNow: syncPsnNow,
    cancel: cancelPsn,
    reset: resetPsn,
  } = usePsnLinkFlow({ setBusy, setPanel });

  const {
    startUrl: xboxStartUrl,
    openSignIn: openXboxSignIn,
    handleCallbackUrl: handleXboxCallbackUrl,
    openExternal: openXboxExternal,
    syncNow: syncXboxNow,
    cancel: cancelXbox,
    reset: resetXbox,
  } = useXboxLinkFlow({ setBusy, setPanel, waitForMounted });

  useLinkDeepLink({
    onSteam: handleSteamCallbackUrl,
    onXbox: handleXboxCallbackUrl,
  });

  // ── Reset transient state when the modal closes ───────────────────────────
  useEffect(() => {
    if (visible) return;
    setPanel("choose");
    setBusy(false);
    resetSteam();
    resetPsn();
    resetXbox();
  }, [visible, resetSteam, resetPsn, resetXbox]);

  // ── Row actions ───────────────────────────────────────────────────────────
  const handleSteamPress = useCallback((): void => {
    if (!steamAccount || steamAccount.status === "reauth_required") {
      void openSteamSignIn();
    } else {
      void syncSteamNow();
    }
  }, [steamAccount, openSteamSignIn, syncSteamNow]);

  const handlePsnPress = useCallback((): void => {
    if (!psnAccount?.onlineId || psnAccount.status === "reauth_required") {
      openPsnWebView();
    } else {
      void syncPsnNow();
    }
  }, [psnAccount, openPsnWebView, syncPsnNow]);

  const handleXboxPress = useCallback((): void => {
    if (!xboxAccount?.xuid || xboxAccount.status === "reauth_required") {
      void openXboxSignIn();
    } else {
      void syncXboxNow();
    }
  }, [xboxAccount, openXboxSignIn, syncXboxNow]);

  /** The PSN probe captured a token — close the WebView before using it. */
  const handlePsnToken = useCallback(
    (npsso: string): void => {
      setPanel("choose");
      void submitPsnNpsso(npsso);
    },
    [submitPsnNpsso],
  );

  /** Android hardware back: step out of a sub-panel first, close modal last. */
  const handleBackButton = useCallback((): void => {
    if (panel === "steamWebView") {
      cancelSteam();
    } else if (panel === "xboxWebView") {
      cancelXbox();
    } else if (panel === "psnWebView" || panel === "psnManual") {
      cancelPsn();
    } else {
      onClose();
    }
  }, [panel, onClose, cancelSteam, cancelXbox, cancelPsn]);

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
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    headerBtn: {
      padding: 4,
    },
    headerBtnPlaceholder: {
      width: 32,
      height: 32,
    },
    /** Shrinks to the modal height cap and becomes scrollable only when the
     * panel content cannot fit (short panels stay exactly as tall as needed). */
    panelScroll: { flexGrow: 0, flexShrink: 1 },
    panelContent: { paddingBottom: 4 },
    stretch: { flex: 1 },
  }));

  const renderPanel = (): React.ReactNode => {
    if (panel === "steamWebView" && steamStartUrl) {
      return (
        <ErrorBoundary
          sectionLabel="LinkAccountModal/Steam"
          fallback={<PanelError onBack={cancelSteam} />}
        >
          <Suspense fallback={<PanelLoading />}>
            <SteamSignInPanel
              startUrl={steamStartUrl}
              onCallbackUrl={handleSteamCallbackUrl}
              onOpenBrowser={openSteamExternal}
              onBack={cancelSteam}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }
    if (panel === "psnWebView") {
      return (
        <ErrorBoundary
          sectionLabel="LinkAccountModal/PSN"
          fallback={<PanelError onBack={cancelPsn} />}
        >
          <Suspense fallback={<PanelLoading />}>
            <PsnSignInPanel
              sessionHint={psnSessionHint}
              busy={busy}
              onNpsso={handlePsnToken}
              onSessionError={markPsnSessionError}
              onClearSessionHint={clearPsnSessionHint}
              onOpenBrowser={openPsnExternal}
              onManualEntry={openPsnManual}
              onBack={cancelPsn}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }
    if (panel === "psnManual") {
      return (
        <PsnManualPanel
          busy={busy}
          onSubmit={submitPsnNpsso}
          onBack={cancelPsn}
        />
      );
    }
    if (panel === "xboxWebView" && xboxStartUrl) {
      return (
        <ErrorBoundary
          sectionLabel="LinkAccountModal/Xbox"
          fallback={<PanelError onBack={cancelXbox} />}
        >
          <Suspense fallback={<PanelLoading />}>
            <XboxSignInPanel
              startUrl={xboxStartUrl}
              onCallbackUrl={handleXboxCallbackUrl}
              onOpenBrowser={openXboxExternal}
              onBack={cancelXbox}
            />
          </Suspense>
        </ErrorBoundary>
      );
    }
    return (
      <ChoosePlatformPanel
        steamAccount={steamAccount}
        psnAccount={psnAccount}
        xboxAccount={xboxAccount}
        busy={busy}
        onSteamPress={handleSteamPress}
        onPsnPress={handlePsnPress}
        onXboxPress={handleXboxPress}
        onSteamRelink={openSteamSignIn}
        onPsnRelink={openPsnWebView}
        onXboxRelink={openXboxSignIn}
        onUnlink={unlink}
        onManualEntry={openPsnManual}
      />
    );
  };

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
            <View style={styles.modalHeader}>
              {isSubPanel ? (
                <TouchableOpacity
                  onPress={handleBackButton}
                  style={styles.headerBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.back") || "Back"}
                >
                  {isRtl ? (
                    <ArrowRight size={24} color={colors.text} />
                  ) : (
                    <ArrowLeft size={24} color={colors.text} />
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.headerBtnPlaceholder} />
              )}

              <TouchableOpacity
                onPress={onClose}
                style={styles.headerBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("common.close") || "Close"}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Small screens: every panel is reachable by scrolling. The
                nested-scroll flag lets the embedded sign-in WebViews and this
                outer scroll cooperate instead of fighting for gestures. */}
            <ScrollView
              style={styles.panelScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelContent}
            >
              {renderPanel()}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
