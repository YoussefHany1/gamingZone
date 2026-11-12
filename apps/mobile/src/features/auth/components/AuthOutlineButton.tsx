import React, { memo } from "react";
import AuthFlatButton from "./AuthFlatButton";
import type { AuthButtonProps } from "./types";

/** Accent-outlined secondary button (e.g. "Create account", "Back to login"). */
const AuthOutlineButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  disabled = false,
  containerStyle,
  accessibilityLabel,
  accessibilityHint,
}) => (
  <AuthFlatButton
    variant="outline"
    label={label}
    onPress={onPress}
    disabled={disabled}
    containerStyle={containerStyle}
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
  />
);

export default memo(AuthOutlineButton);
