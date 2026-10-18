import React, { memo } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EmailVerificationCardProps } from "./types";

/**
 * Prompt to verify the account's email, and — once verified — a confirmation
 * that replaces it.
 */
const EmailVerificationCard = memo(
  ({
    emailVerified,
    isChecking,
    onSendEmail,
    onRefresh,
  }: EmailVerificationCardProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      verifyContainer: { marginBottom: 20 },
      verifyBox: {
        backgroundColor: c.accentSurface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
      },
      verifyBoxVerified: {
        backgroundColor: c.accentSurface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
      },
      verifyText: { color: c.text, fontSize: 16, fontWeight: "600" },
      verifyAction: {
        color: c.accentText,
        fontSize: 14,
        fontWeight: "700",
        marginTop: 6,
        textDecorationLine: "underline",
      },
      verificationSpinner: { marginTop: 6 },
    }));

    if (emailVerified) {
      return (
        <View style={[styles.verifyContainer, styles.verifyBoxVerified]}>
          <CustomText style={styles.verifyText}>{t("auth.emailVerified")}</CustomText>
        </View>
      );
    }

    return (
      <View style={styles.verifyContainer}>
        <View style={styles.verifyBox}>
          <CustomText style={styles.verifyText}>
            {t("auth.emailNotVerified")}
          </CustomText>
          <TouchableOpacity
            onPress={() => {
              void onSendEmail();
            }}
          >
            <CustomText style={styles.verifyAction}>
              {t("auth.verifyEmail")}
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              void onRefresh();
            }}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator
                size="small"
                color={colors.accentText}
                style={styles.verificationSpinner}
              />
            ) : (
              <CustomText style={styles.verifyAction}>
                {t("auth.verifyPrompt.iveVerified")}
              </CustomText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

EmailVerificationCard.displayName = "EmailVerificationCard";
export default EmailVerificationCard;
