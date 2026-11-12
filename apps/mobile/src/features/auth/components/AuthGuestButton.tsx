import React, { memo } from "react";
import AuthFlatButton from "./AuthFlatButton";
import type { AuthButtonProps } from "./types";

/** Underlined "Continue as guest" button. */
const AuthGuestButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  disabled = false,
  containerStyle,
  accessibilityLabel,
  accessibilityHint,
}) => (
  <AuthFlatButton
    variant="guest"
    label={label}
    onPress={onPress}
    disabled={disabled}
    containerStyle={containerStyle}
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
  />
);

export default memo(AuthGuestButton);
