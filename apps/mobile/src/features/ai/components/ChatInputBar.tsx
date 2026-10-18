import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomTextInput from "@/src/components/CustomTextInput";
import { Send } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { MAX_MESSAGES_PER_DAY } from "../lib/aiLimit";
import type { ChatInputBarProps } from "./types";

/** Multiline draft input with the send button and remaining-quota placeholder. */
const ChatInputBar: React.FC<ChatInputBarProps> = ({
  value,
  onChangeText,
  onSend,
  remaining,
  isLoading,
}) => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    textInput: {
      flex: 1,
      color: c.text,
      backgroundColor: c.accentSurface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      fontSize: 16,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: c.accent,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 10,
    },
    sendButtonDisabled: {
      backgroundColor: c.textSubtle,
    },
  }));

  const canSend = value.trim().length > 0 && !isLoading;

  const placeholder =
    remaining !== null
      ? `${t("aiChat.placeholder")} (${remaining}/${MAX_MESSAGES_PER_DAY})`
      : t("aiChat.placeholder");

  return (
    <View style={styles.inputContainer}>
      <CustomTextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        multiline
        maxLength={500}
      />
      <TouchableOpacity
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Send size={24} color={colors.onAccent} />
      </TouchableOpacity>
    </View>
  );
};

export default memo(ChatInputBar);
