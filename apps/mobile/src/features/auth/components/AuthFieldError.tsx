import React, { memo } from "react";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ViewStyle } from "react-native";

export type AuthFieldErrorProps = {
  /** Localised error message, or `null`/`undefined` to render nothing. */
  message?: string | null;
  /** Extra layout style (negative margins etc.) applied to the text. */
  style?: ViewStyle;
};

/**
 * Inline validation message rendered beneath a field.
 *
 * `accessibilityRole="alert"` makes screen readers announce the message the
 * moment it appears, matching how sighted users perceive the red text.
 */
const AuthFieldError: React.FC<AuthFieldErrorProps> = ({ message, style }) => {
  const styles = useThemeStyles((c) => ({
    error: {
      color: c.danger,
      fontSize: 12,
      marginTop: 4,
    },
  }));

  if (!message) return null;

  return (
    <CustomText
      style={[styles.error, style]}
      accessibilityRole="alert"
      numberOfLines={2}
    >
      {message}
    </CustomText>
  );
};

export default memo(AuthFieldError);
