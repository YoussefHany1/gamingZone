import { Alert, Platform, ToastAndroid } from "react-native";

/**
 * Cross-platform transient message.
 *
 * `ToastAndroid` only exists on Android — on iOS React Native provides a no-op
 * stub, so calling it directly silently swallows the message. Auth failures use
 * this helper so an error is never invisible on iOS. `Alert` is the closest
 * blocking equivalent of a toast there.
 *
 * @param message Body text to show.
 * @param title Optional alert title (iOS only — Android toasts are title-less).
 */
export function showToast(message: string, title?: string): void {
  if (!message) return;

  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
    return;
  }

  Alert.alert(title ?? "", message);
}
