import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import PressScale from "@/src/components/PressScale";
import type { AlertButton, AlertConfig } from "@/src/store/useAlertStore";
import { useAlertStore } from "@/src/store/useAlertStore";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** Same spring family PressScale uses, so press feedback and entrance agree. */
const SPRING = { damping: 18, stiffness: 280, mass: 0.7 };

/**
 * Global themed replacement for React Native's `Alert`.
 *
 * Rendered once at the app root (next to `GamificationOverlay`, outside the
 * `NavigationContainer`) and driven entirely by `useAlertStore`. Shows the
 * store's current alert, animates in with a backdrop fade + card spring, and
 * animates out before unmounting. Call sites never touch this file — they use
 * `Alert` from `@/src/lib/alert`.
 *
 * Native-parity behavior:
 *  - Tapping any button dismisses FIRST, then fires its `onPress`.
 *  - Backdrop taps and the Android back button dismiss only when the alert is
 *    `cancelable`, routed through the "cancel" button when one exists.
 *  - Alerts with no buttons get a localized "OK" (like iOS).
 */
const AlertHost = (): React.ReactElement => {
  const { t } = useTranslation();
  const config = useAlertStore((state) => state.alert);

  /** Modal mounted while visible; frozen view of the alert during exit anim. */
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState<AlertConfig | null>(null);
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.92);

  /** Called from the exit animation's worklet when the fade completes. */
  const finishExit = useCallback(() => {
    // A newer alert may have taken the stage while the old one was still
    // fading out — only actually hide when the store is empty.
    if (useAlertStore.getState().alert === null) {
      setVisible(false);
      scale.value = 0.92;
    }
  }, [scale]);

  useEffect(() => {
    if (config) {
      setShown(config);
      setVisible(true);
      fade.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, SPRING);
    } else {
      // Skip the exit dance if nothing was ever mounted (or already exited).
      if (fade.value === 0) return;
      fade.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(finishExit)();
      });
    }
  }, [config, fade, scale, finishExit]);

  /** Dismiss first (native order), then run the button's own action. */
  const handlePress = useCallback((button?: AlertButton) => {
    useAlertStore.getState().hideAlert();
    button?.onPress?.();
  }, []);

  /**
   * Backdrop / Android back dismissal. Reads the store directly (same reason
   * `handlePress` does) so it always evaluates the *current* alert's
   * cancelable flag and cancel button, even mid-transition.
   */
  const handleCancel = useCallback(() => {
    const current = useAlertStore.getState().alert;
    if (!current || current.cancelable === false) return;
    const cancel = current.buttons?.find((b) => b.style === "cancel");
    handlePress(cancel);
  }, [handlePress]);

  const buttons: AlertButton[] =
    shown?.buttons && shown.buttons.length > 0
      ? shown.buttons
      : [{ text: t("common.ok") || "OK", style: "default" }];

  const styles = useThemeStyles((c) => ({
    host: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.overlay,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: c.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 8,
    },
    rowActions: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 20,
    },
    stackActions: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    // Full-width primary pill (single-button alerts).
    action: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    actionPrimary: {
      backgroundColor: c.accent,
    },
    actionTextPrimary: {
      fontSize: 15,
      fontWeight: "600",
      color: c.onAccent,
    },
    // Subtle secondary (cancel in a horizontal row).
    actionCancel: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    actionTextCancel: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    // Danger-tinted fill (destructive standalone button).
    actionDestructive: {
      backgroundColor: c.danger + "1A",
    },
    actionTextDestructive: {
      fontSize: 15,
      fontWeight: "600",
      color: c.danger,
    },
    // Vertical stack (3+ options, ChatScreen-style action menus).
    stackRow: {
      paddingVertical: 13,
      alignItems: "center",
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    stackCancelGap: {
      marginTop: 10,
    },
    stackText: {
      fontSize: 15,
      fontWeight: "600",
      color: c.accentText,
    },
    stackTextDestructive: {
      color: c.danger,
    },
    stackTextCancel: {
      color: c.text,
    },
  }));

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));

  if (!shown) return <View />;

  // For 3+ options (ChatScreen-style action menus) the cancel button leaves
  // the decision stack and gets pinned at the bottom, separated.
  const stacked =
    buttons.length > 2 ? buttons.filter((b) => b.style !== "cancel") : [];
  const stackedCancel =
    buttons.length > 2 ? buttons.find((b) => b.style === "cancel") : undefined;

  /** Button treatment by its declared style. */
  const actionStyle = (button: AlertButton) => {
    if (button.style === "cancel") return [styles.action, styles.actionCancel];
    if (button.style === "destructive")
      return [styles.action, styles.actionDestructive];
    return [styles.action, styles.actionPrimary];
  };

  const actionTextStyle = (button: AlertButton) => {
    if (button.style === "destructive") return styles.actionTextDestructive;
    if (button.style === "cancel") return styles.actionTextCancel;
    return styles.actionTextPrimary;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.host}>
        <Animated.View style={[styles.backdrop, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        </Animated.View>

        <Animated.View style={[styles.card, cardStyle]}>
          {/* Swallows taps on the card's empty areas so they don't reach the
              backdrop pressable underneath. Content pressed later in the
              tree, so buttons stay reachable. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

          <View style={styles.body}>
            {shown.title ? (
              <CustomText style={styles.title}>{shown.title}</CustomText>
            ) : null}
            {shown.message ? (
              <CustomText style={styles.message}>{shown.message}</CustomText>
            ) : null}
          </View>

          {stacked.length === 0 ? (
            <View style={styles.rowActions}>
              {buttons.map((button) => (
                <PressScale
                  key={button.text}
                  style={actionStyle(button)}
                  onPress={() => handlePress(button)}
                >
                  <CustomText style={actionTextStyle(button)}>
                    {button.text}
                  </CustomText>
                </PressScale>
              ))}
            </View>
          ) : (
            <View style={styles.stackActions}>
              {stacked.map((button) => (
                <PressScale
                  key={button.text}
                  style={styles.stackRow}
                  onPress={() => handlePress(button)}
                >
                  <CustomText
                    style={[
                      styles.stackText,
                      button.style === "destructive" &&
                        styles.stackTextDestructive,
                    ]}
                  >
                    {button.text}
                  </CustomText>
                </PressScale>
              ))}
              {stackedCancel ? (
                <PressScale
                  style={[styles.stackRow, styles.stackCancelGap]}
                  onPress={() => handlePress(stackedCancel)}
                >
                  <CustomText
                    style={[styles.stackText, styles.stackTextCancel]}
                  >
                    {stackedCancel.text}
                  </CustomText>
                </PressScale>
              ) : null}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AlertHost;
