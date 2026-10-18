import React, { memo } from "react";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GoogleIcon } from "@/src/components/icons/BrandIcons";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AuthButtonProps } from "./types";

// Fixed Google brand gradient — intentionally identical in both themes.
const GRADIENT_COLORS: [string, string, string, string] = [
  "#10574b",
  "#3174f1",
  "#e92d18",
  "#c38d0c",
];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/** Google sign-in button rendered on the brand gradient. */
const AuthGoogleButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  containerStyle,
}) => {
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
    },
    // Sits on the fixed Google brand gradient, which is identical in both
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
    >
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={styles.gradient}
        start={GRADIENT_START}
        end={GRADIENT_END}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <GoogleIcon size={28} />
            <CustomText style={styles.brandButtonText}> {label}</CustomText>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default memo(AuthGoogleButton);
