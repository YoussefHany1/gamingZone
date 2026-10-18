import React, { memo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ContactEmailFieldProps } from "./types";

/** The optional reply-to address, pre-filled from the signed-in account. */
const ContactEmailField = memo(
  ({ value, onChangeText }: ContactEmailFieldProps): React.ReactElement => {
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
      emailInput: { textAlign: "left" },
    }));

    return (
      <>
        <CustomText style={styles.label}>{t("settings.contact.emailLabel")}</CustomText>
        <View style={styles.inputContainer}>
          <CustomTextInput
            style={[styles.input, styles.emailInput]}
            placeholder="example@email.com"
            placeholderTextColor={colors.textSubtle}
            keyboardType="email-address"
            autoCapitalize="none"
            value={value}
            onChangeText={onChangeText}
          />
        </View>
      </>
    );
  },
);

ContactEmailField.displayName = "ContactEmailField";
export default ContactEmailField;
