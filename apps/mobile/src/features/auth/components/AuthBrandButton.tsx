import React, { memo } from "react";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AuthButtonProps } from "./types";

/** Props for the fixed-gradient brand buttons (Google, Discord). */
export type AuthBrandButtonProps = AuthButtonProps & {
  /** Fixed brand gradient — intentionally identical in both themes. */
  gradientColors: readonly [string, string, ...string[]];
  /** Brand mark rendered before the label while not loading. */
  icon: React.ReactNode;
};

// Fixed brand gradient direction — shared by every brand button.
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/**
 * Base for sign-in buttons that sit on a fixed brand gradient. The gradient
 * and text color must not follow the palette, since the brand markup is
 * identical in both themes — so `useThemeStyles` is only used for the
 * layout values here.
 */
const AuthBrandButton: React.FC<AuthBrandButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  containerStyle,
  accessibilityLabel,
  accessibilityHint,
  gradientColors,
  icon,
}) => {
  const { t } = useTranslation();
  const styles = useThemeStyles(() => ({
    wrapper: {
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    gradient: {
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
    },
    // Sits on the fixed brand gradient, which is identical in both
    // themes — so it must not follow the palette.
    brandButtonText: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
    },
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.wrapper, containerStyle, disabled && styles.buttonDisabled]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint ?? t("auth.a11y.buttonHint")}
      accessibilityState={{ disabled, busy: loading }}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={GRADIENT_START}
        end={GRADIENT_END}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            {icon}
            <CustomText style={styles.brandButtonText}>{label}</CustomText>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default memo(AuthBrandButton);
