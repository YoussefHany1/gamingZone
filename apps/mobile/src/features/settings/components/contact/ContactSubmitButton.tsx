import React, { memo } from "react";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ContactSubmitButtonProps } from "./types";

/** Sends the feedback; swaps its label for a spinner while in flight. */
const ContactSubmitButton = memo(
  ({ isSending, onPress }: ContactSubmitButtonProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      submitButton: {
        backgroundColor: c.accent,
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
      },
      submitText: { color: c.onAccent, fontSize: 18, fontWeight: "bold" },
    }));

    return (
      <TouchableOpacity style={styles.submitButton} onPress={onPress} disabled={isSending}>
        {isSending ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <CustomText style={styles.submitText}>{t("settings.contact.send")}</CustomText>
        )}
      </TouchableOpacity>
    );
  },
);

ContactSubmitButton.displayName = "ContactSubmitButton";
export default ContactSubmitButton;
