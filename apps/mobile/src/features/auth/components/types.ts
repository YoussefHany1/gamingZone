/**
 * Prop types for the shared auth component family.
 */
import type { StyleProp, ViewStyle } from "react-native";

export type AuthLogoProps = {
  /** Rendered square size in px. Defaults to 220. */
  size?: number;
};

/** Shared shape for the primary / Google / outline / guest buttons. */
export type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Extra layout style (margins etc.) applied on top of the base button. */
  containerStyle?: StyleProp<ViewStyle>;
};

export type AuthPasswordInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export type VerifyEmailModalProps = {
  visible: boolean;
  email: string;
  isChecking: boolean;
  isResending: boolean;
  onCheckVerified: () => void;
  onResend: () => void;
  onSkip: () => void;
};
