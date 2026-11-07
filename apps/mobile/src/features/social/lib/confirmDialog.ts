import { Alert } from "react-native";

export type ConfirmDialogOptions = {
  /** Alert title (already translated). */
  title: string;
  /** Affirmative button label (already translated). */
  confirmLabel: string;
  /** Dismissive button label (already translated). */
  cancelLabel: string;
  onConfirm: () => void;
};

/**
 * The cancel/confirm alert used before destructive or state-changing social
 * actions (delete chat, remove friend, block, …). Labels stay translated at
 * the call site so the helper itself needs no i18n dependency.
 */
export function showConfirmAlert({
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: ConfirmDialogOptions): void {
  Alert.alert(title, undefined, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}
