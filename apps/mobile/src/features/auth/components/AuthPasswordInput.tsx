import React, { memo, forwardRef, useCallback, useState } from "react";
import { TouchableOpacity, type TextInput } from "react-native";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AuthInput, { type AuthInputProps } from "./AuthInput";

/**
 * Password-specific input: everything is inherited from `AuthInputProps`
 * (placeholder, error, ref, keyboard props, …) plus a fixed `Lock` icon and
 * a show/hide eye toggle rendered as the trailing slot.
 */
export type AuthPasswordInputProps = Omit<
  AuthInputProps,
  "icon" | "rightSlot" | "secureTextEntry" | "autoComplete" | "textContentType"
> & {
  /** Password-manager hint: `new-password` on the register screen. */
  autoComplete?: "current-password" | "new-password";
  /** iOS Keychain hint; derived from `autoComplete` when omitted. */
  textContentType?: "password" | "newPassword";
};

const AuthPasswordInput = memo(
  forwardRef<TextInput, AuthPasswordInputProps>(function AuthPasswordInput(
    {
      autoComplete = "current-password",
      textContentType,
      accessibilityLabel,
      accessibilityHint,
      ...props
    },
    ref,
  ) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const [showPassword, setShowPassword] = useState(false);

    const styles = useThemeStyles(() => ({
      eyeButton: { padding: 4 },
    }));

    const toggle = useCallback(() => setShowPassword((v) => !v), []);

    const resolvedTextContentType =
      textContentType ??
      (autoComplete === "new-password" ? "newPassword" : "password");

    return (
      <AuthInput
        ref={ref}
        {...props}
        icon={Lock}
        autoComplete={autoComplete}
        textContentType={resolvedTextContentType}
        autoCapitalize="none"
        secureTextEntry={!showPassword}
        accessibilityLabel={
          accessibilityLabel ?? t("auth.a11y.passwordLabel")
        }
        accessibilityHint={
          accessibilityHint ??
          (autoComplete === "new-password"
            ? t("auth.a11y.newPasswordHint")
            : t("auth.a11y.passwordHint"))
        }
        rightSlot={
          <TouchableOpacity
            onPress={toggle}
            style={styles.eyeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword
                ? t("auth.a11y.hidePassword")
                : t("auth.a11y.showPassword")
            }
            accessibilityHint={
              showPassword
                ? t("auth.a11y.hidePasswordHint")
                : t("auth.a11y.showPasswordHint")
            }
          >
            {showPassword ? (
              <EyeOff size={22} color={colors.textSubtle} />
            ) : (
              <Eye size={22} color={colors.textSubtle} />
            )}
          </TouchableOpacity>
        }
      />
    );
  }),
);

AuthPasswordInput.displayName = "AuthPasswordInput";

export default AuthPasswordInput;
