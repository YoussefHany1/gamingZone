import React, { memo } from "react";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AuthButtonProps } from "./types";

/** The flat (non-gradient) auth button variants. */
export type AuthFlatButtonVariant = "primary" | "outline" | "guest";

export type AuthFlatButtonProps = AuthButtonProps & {
  /**
   * Visual variant. `primary` is the accent-filled submit button, `outline`
   * the bordered secondary action, `guest` the quiet underlined link.
   */
  variant: AuthFlatButtonVariant;
};

/**
 * Base for the flat auth buttons (primary, outline, guest). All variants
 * share the same TouchableOpacity wrapper, disabled-opacity treatment and
 * inline loading-spinner behavior — only the surface and text styles differ.
 */
const AuthFlatButton: React.FC<AuthFlatButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  containerStyle,
  accessibilityLabel,
  accessibilityHint,
  variant,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles(
    (c) => {
      const buttonDisabled = { opacity: 0.6 };

      if (variant === "guest") {
        return {
          button: {
            marginVertical: 15,
            padding: 10,
            alignItems: "center",
          },
          buttonDisabled,
          buttonText: {
            color: c.textMuted,
            fontSize: 16,
            textDecorationLine: "underline",
          },
        };
      }

      if (variant === "outline") {
        return {
          button: {
            borderWidth: 2,
            borderColor: c.accent,
            padding: 15,
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
          },
          buttonDisabled,
          buttonText: {
            color: c.onAccent,
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
          },
        };
      }

      return {
        button: {
          backgroundColor: c.accent,
          padding: 15,
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: 15,
        },
        buttonDisabled,
        buttonText: {
          color: c.onAccent,
          fontSize: 18,
          fontWeight: "bold",
          textAlign: "center",
        },
      };
    },
    [variant],
  );

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint ?? t("auth.a11y.buttonHint")}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} size="small" />
      ) : (
        <CustomText style={styles.buttonText}>{label}</CustomText>
      )}
    </TouchableOpacity>
  );
};

export default memo(AuthFlatButton);
