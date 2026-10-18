import React, { memo } from "react";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AuthButtonProps } from "./types";

/** Accent-filled submit button with an inline loading spinner. */
const AuthPrimaryButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  containerStyle,
}) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    button: {
      backgroundColor: c.accent,
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 15,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: c.onAccent,
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
    },
  }));

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} size="small" />
      ) : (
        <CustomText style={styles.buttonText}>{label}</CustomText>
      )}
    </TouchableOpacity>
  );
};

export default memo(AuthPrimaryButton);
