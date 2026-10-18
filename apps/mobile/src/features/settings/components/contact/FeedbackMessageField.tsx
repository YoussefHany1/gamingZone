import React, { memo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { MAX_MESSAGE_LENGTH } from "../../lib/contact";
import type { FeedbackMessageFieldProps } from "./types";

/** The multiline feedback body, with its live character count. */
const FeedbackMessageField = memo(
  ({ value, onChangeText }: FeedbackMessageFieldProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      label: {
        color: c.text,
        fontSize: 16,
        marginBottom: 10,
        fontWeight: "bold",
        textAlign: "left",
      },
      inputContainer: {
        backgroundColor: c.accentSurface,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: c.border,
      },
      input: { color: c.text, padding: 15, fontSize: 16 },
      textArea: { minHeight: 120 },
      charCount: { color: c.textMuted, fontSize: 12, padding: 10, paddingBottom: 8 },
      charCountLimit: { color: c.danger },
    }));

    const isAtLimit = value.length === MAX_MESSAGE_LENGTH;

    return (
      <>
        <CustomText style={styles.label}>{t("settings.contact.messageLabel")}</CustomText>
        <View style={styles.inputContainer}>
          <CustomTextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("settings.contact.messagePlaceholder")}
            placeholderTextColor={colors.textSubtle}
            multiline
            numberOfLines={6}
            value={value}
            onChangeText={onChangeText}
            textAlignVertical="top"
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <CustomText
            style={[styles.charCount, isAtLimit && styles.charCountLimit]}
          >
            {value.length} / {MAX_MESSAGE_LENGTH}
          </CustomText>
        </View>
      </>
    );
  },
);

FeedbackMessageField.displayName = "FeedbackMessageField";
export default FeedbackMessageField;
