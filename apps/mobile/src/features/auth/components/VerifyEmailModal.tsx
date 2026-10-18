import React, { memo } from "react";
import { View, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { VerifyEmailModalProps } from "./types";

/**
 * Post-signup email verification prompt. Verification is optional — the modal
 * offers "I've verified", "Resend", and a "Continue" escape hatch.
 */
const VerifyEmailModal: React.FC<VerifyEmailModalProps> = ({
  visible,
  email,
  isChecking,
  isResending,
  onCheckVerified,
  onResend,
  onSkip,
}) => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    verifyModalContainer: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: c.overlay,
      paddingHorizontal: 24,
    },
    verifyModalContent: {
      backgroundColor: c.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.accentBorder,
      padding: 20,
    },
    verifyModalTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 12,
    },
    verifyModalText: {
      color: c.text,
      fontSize: 15,
      textAlign: "center",
      marginBottom: 10,
    },
    verifyModalNote: {
      color: c.textSubtle,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 18,
    },
    verifyModalActions: {
      gap: 10,
    },
    verifyPrimaryBtn: {
      backgroundColor: c.accent,
      padding: 14,
      borderRadius: 10,
      alignItems: "center",
    },
    verifySecondaryBtn: {
      borderWidth: 2,
      borderColor: c.accent,
      padding: 14,
      borderRadius: 10,
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    verifyPrimaryBtnText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: "bold",
    },
    verifySecondaryBtnText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "bold",
    },
    verifySkipText: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center",
      textDecorationLine: "underline",
      paddingVertical: 6,
    },
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.verifyModalContainer}>
        <View style={styles.verifyModalContent}>
          <CustomText style={styles.verifyModalTitle}>
            {t("auth.verifyPrompt.title")}
          </CustomText>
          <CustomText style={styles.verifyModalText}>
            {t("auth.verifyPrompt.message", { email })}
          </CustomText>
          <CustomText style={styles.verifyModalNote}>
            {t("auth.verifyPrompt.optionalNote")}
          </CustomText>

          <View style={styles.verifyModalActions}>
            <TouchableOpacity
              style={[
                styles.verifyPrimaryBtn,
                (isChecking || isResending) && styles.buttonDisabled,
              ]}
              onPress={onCheckVerified}
              disabled={isChecking || isResending}
            >
              {isChecking ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <CustomText style={styles.verifyPrimaryBtnText}>
                  {t("auth.verifyPrompt.iveVerified")}
                </CustomText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.verifySecondaryBtn,
                (isResending || isChecking) && styles.buttonDisabled,
              ]}
              onPress={onResend}
              disabled={isResending || isChecking}
            >
              {isResending ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <CustomText style={styles.verifySecondaryBtnText}>
                  {t("auth.verifyPrompt.resend")}
                </CustomText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSkip}
              disabled={isChecking || isResending}
            >
              <CustomText style={styles.verifySkipText}>
                {t("auth.verifyPrompt.continue")}
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default memo(VerifyEmailModal);
