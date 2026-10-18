import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AuthButtonProps } from "./types";

/** Accent-outlined secondary button (e.g. "Create account", "Back to login"). */
const AuthOutlineButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  disabled = false,
  containerStyle,
}) => {
  const styles = useThemeStyles((c) => ({
    button: {
      borderWidth: 2,
      borderColor: c.accent,
      padding: 15,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
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
      <CustomText style={styles.buttonText}>{label}</CustomText>
    </TouchableOpacity>
  );
};

export default memo(AuthOutlineButton);
