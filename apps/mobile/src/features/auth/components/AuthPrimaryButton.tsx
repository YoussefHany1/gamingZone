import React, { memo } from "react";
import AuthFlatButton from "./AuthFlatButton";
import type { AuthButtonProps } from "./types";

/** Accent-filled submit button with an inline loading spinner. */
const AuthPrimaryButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  containerStyle,
}) => (
  <AuthFlatButton
    variant="primary"
    label={label}
    onPress={onPress}
    loading={loading}
    disabled={disabled}
    containerStyle={containerStyle}
  />
);

export default memo(AuthPrimaryButton);
