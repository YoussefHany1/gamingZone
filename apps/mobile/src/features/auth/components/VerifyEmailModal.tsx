import React, { memo } from "react";
import {
  View,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
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
  resendCooldown = 0,
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
      accessibilityViewIsModal
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
            <Pressable
              style={({ pressed }) => [
                styles.verifyPrimaryBtn,
                (isChecking || isResending) && styles.buttonDisabled,
                Platform.OS === "android" && pressed && { opacity: 0.85 },
              ]}
              onPress={onCheckVerified}
              disabled={isChecking || isResending}
              accessibilityRole="button"
              accessibilityLabel={t("auth.verifyPrompt.iveVerified")}
              accessibilityHint={t("auth.a11y.verifyHint")}
              accessibilityState={{
                disabled: isChecking || isResending,
                busy: isChecking,
              }}
              android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
            >
              {isChecking ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <CustomText style={styles.verifyPrimaryBtnText}>
                  {t("auth.verifyPrompt.iveVerified")}
                </CustomText>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.verifySecondaryBtn,
                (isResending || isChecking || resendCooldown > 0) &&
                  styles.buttonDisabled,
                Platform.OS === "android" && pressed && { opacity: 0.85 },
              ]}
              onPress={onResend}
              disabled={isResending || isChecking || resendCooldown > 0}
              accessibilityRole="button"
              accessibilityLabel={t("auth.verifyPrompt.resend")}
              accessibilityHint={t("auth.a11y.resendHint")}
              accessibilityState={{
                disabled: isResending || isChecking || resendCooldown > 0,
                busy: isResending,
              }}
              android_ripple={{ color: "rgba(128,128,128,0.2)", borderless: false }}
            >
              {isResending ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <CustomText style={styles.verifySecondaryBtnText}>
                  {resendCooldown > 0
                    ? t("auth.verifyPrompt.resendIn", {
                        seconds: resendCooldown,
                      })
                    : t("auth.verifyPrompt.resend")}
                </CustomText>
              )}
            </Pressable>

            <Pressable
              onPress={onSkip}
              disabled={isChecking || isResending}
              accessibilityRole="button"
              accessibilityLabel={t("auth.verifyPrompt.continue")}
              accessibilityHint={t("auth.a11y.continueHint")}
              accessibilityState={{ disabled: isChecking || isResending }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CustomText style={styles.verifySkipText}>
                {t("auth.verifyPrompt.continue")}
              </CustomText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default memo(VerifyEmailModal);
