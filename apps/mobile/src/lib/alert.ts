import { useAlertStore } from "@/src/store/useAlertStore";
import type { AlertButton, AlertConfig, AlertButtonStyle } from "@/src/store/useAlertStore";

export type { AlertButton, AlertConfig, AlertButtonStyle };

export function showAlert(
  title?: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean },
): void {
  useAlertStore.getState().showAlert({
    title,
    message,
    buttons,
    cancelable: options?.cancelable,
  });
}

/**
 * Drop-in replacement for React Native's `Alert`. Migrating a call site is a
 * one-line change:
 *
 *   - import { Alert } from "react-native";
 *   + import { Alert } from "@/src/lib/alert";
 *
 * `Alert.alert` keeps the native signature (title, message, buttons,
 * { cancelable }) — including the dismiss-then-fire-onPress ordering and the
 * backdrop/back-button routes through the "cancel" button — so call-site
 * bodies stay untouched.
 */
export const Alert = { alert: showAlert };
