import React, { memo, useCallback, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomTextInput from "@/src/components/CustomTextInput";
import { Eye, EyeOff } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { AuthPasswordInputProps } from "./types";

/** Password field with a show/hide eye toggle. */
const AuthPasswordInput: React.FC<AuthPasswordInputProps> = ({
  value,
  onChangeText,
  placeholder,
}) => {
  const colors = useThemeColors();
  const [showPassword, setShowPassword] = useState(false);

  const styles = useThemeStyles((c) => ({
    wrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 5,
      marginBottom: 10,
      paddingRight: 12,
    },
    input: {
      flex: 1,
      color: c.text,
      padding: 15,
    },
    eyeButton: {
      padding: 4,
    },
  }));

  const toggle = useCallback(() => setShowPassword((v) => !v), []);

  return (
    <View style={styles.wrapper}>
      <CustomTextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
      />
      <TouchableOpacity
        onPress={toggle}
        style={styles.eyeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {showPassword ? (
          <EyeOff size={22} color={colors.textSubtle} />
        ) : (
          <Eye size={22} color={colors.textSubtle} />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default memo(AuthPasswordInput);
