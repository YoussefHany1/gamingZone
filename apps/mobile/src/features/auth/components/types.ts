/**
 * Prop types for the shared auth component family.
 */
import type { StyleProp, ViewStyle } from "react-native";

export type AuthLogoProps = {
  /** Rendered square size in px. Defaults to 220. */
  size?: number;
};

export type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Extra layout style (margins etc.) applied on top of the base button. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Screen-reader label; defaults to the visible `label`. */
  accessibilityLabel?: string | undefined;
  /** Screen-reader hint describing what pressing the button does. */
  accessibilityHint?: string | undefined;
};

/**
 * Password input props are now owned by `AuthPasswordInput.tsx`
 * (`AuthPasswordInputProps`, derived from `AuthInputProps`).
 */

export type VerifyEmailModalProps = {
  visible: boolean;
  email: string;
  isChecking: boolean;
  isResending: boolean;
  /** Seconds left on the resend cooldown; `0` allows a resend. */
  resendCooldown?: number;
  onCheckVerified: () => void;
  onResend: () => void;
  onSkip: () => void;
};


