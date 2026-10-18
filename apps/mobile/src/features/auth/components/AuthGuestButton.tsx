import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AuthButtonProps } from "./types";

/** Underlined "Continue as guest" button. */
const AuthGuestButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  disabled = false,
  containerStyle,
}) => {
  const styles = useThemeStyles((c) => ({
    button: {
      marginVertical: 15,
      padding: 10,
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: c.textMuted,
      fontSize: 16,
      textDecorationLine: "underline",
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

export default memo(AuthGuestButton);
