import React, { memo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import AuthPasswordInput from "@/src/features/auth/components/AuthPasswordInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ReauthModalProps } from "./types";

/**
 * Re-authentication prompt shown when Firebase refuses a sensitive operation
 * (deleting the account) because the session is too old.
 *
 * The method mirrors how the account was created: a password field for
 * email/password accounts, a Google button for Google accounts, and a Discord
 * button for Discord-based sessions. Password accounts get a Discord escape
 * hatch because Discord sign-up stores an unknown random password.
 */
const ReauthModal = memo(
  ({
    visible,
    method,
    password,
    errorMessage,
    isSubmitting,
    showDiscordAlternative,
    onChangePassword,
    onSubmitPassword,
    onVerifyWithGoogle,
    onVerifyWithDiscord,
    onCancel,
  }: ReauthModalProps): React.ReactElement => {
    const { t } = useTranslation();
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      overlay: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: c.overlay,
        paddingHorizontal: 24,
      },
      card: {
        backgroundColor: c.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.accentBorder,
        padding: 20,
      },
      title: {
        color: c.text,
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 12,
      },
      message: {
        color: c.text,
        fontSize: 15,
        textAlign: "center",
        lineHeight: 21,
        marginBottom: 16,
      },
      error: {
        color: c.danger,
        fontSize: 13,
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 12,
      },
      primaryBtn: {
        backgroundColor: c.danger,
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
      },
      primaryBtnText: {
        color: c.onAccent,
        fontSize: 16,
        fontWeight: "bold",
      },
      secondaryBtn: {
        borderWidth: 2,
        borderColor: c.accent,
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
      },
      secondaryBtnText: {
        color: c.text,
        fontSize: 16,
        fontWeight: "bold",
      },
      discordLink: {
        paddingVertical: 12,
      },
      discordLinkText: {
        color: c.textMuted,
        fontSize: 14,
        textAlign: "center",
        textDecorationLine: "underline",
      },
      cancelBtn: {
        paddingVertical: 10,
        marginTop: 4,
      },
      cancelText: {
        color: c.textMuted,
        fontSize: 14,
        textAlign: "center",
      },
      buttonDisabled: {
        opacity: 0.6,
      },
      gap: {
        gap: 10,
      },
    }));

    const disabled = isSubmitting;
    const close = disabled ? undefined : onCancel;

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.card}>
            <CustomText style={styles.title}>
              {t("settings.deleteAccount.reauthTitle")}
            </CustomText>
            <CustomText style={styles.message}>
              {t("settings.deleteAccount.reauthMessage")}
            </CustomText>

            {method === "password" ? (
              <AuthPasswordInput
                value={password}
                onChangeText={onChangePassword}
                placeholder={t("settings.deleteAccount.passwordPlaceholder")}
              />
            ) : null}

            {errorMessage ? (
              <CustomText style={styles.error}>{errorMessage}</CustomText>
            ) : null}

            <View style={styles.gap}>
              {method === "password" ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, disabled && styles.buttonDisabled]}
                  onPress={onSubmitPassword}
                  disabled={disabled}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onAccent} size="small" />
                  ) : (
                    <CustomText style={styles.primaryBtnText}>
                      {t("settings.deleteAccount.verifyAndDelete")}
                    </CustomText>
                  )}
                </TouchableOpacity>
              ) : null}

              {method === "google" ? (
                <TouchableOpacity
                  style={[styles.secondaryBtn, disabled && styles.buttonDisabled]}
                  onPress={onVerifyWithGoogle}
                  disabled={disabled}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <CustomText style={styles.secondaryBtnText}>
                      {t("settings.deleteAccount.verifyWithGoogle")}
                    </CustomText>
                  )}
                </TouchableOpacity>
              ) : null}

              {method === "discord" ? (
                <TouchableOpacity
                  style={[styles.secondaryBtn, disabled && styles.buttonDisabled]}
                  onPress={onVerifyWithDiscord}
                  disabled={disabled}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <CustomText style={styles.secondaryBtnText}>
                      {t("settings.deleteAccount.verifyWithDiscord")}
                    </CustomText>
                  )}
                </TouchableOpacity>
              ) : null}

              {method === "password" && showDiscordAlternative ? (
                <TouchableOpacity
                  style={[styles.discordLink, disabled && styles.buttonDisabled]}
                  onPress={onVerifyWithDiscord}
                  disabled={disabled}
                >
                  <CustomText style={styles.discordLinkText}>
                    {t("settings.deleteAccount.discordAlternative")}
                  </CustomText>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.cancelBtn, disabled && styles.buttonDisabled]}
                onPress={onCancel}
                disabled={disabled}
              >
                <CustomText style={styles.cancelText}>{t("common.cancel")}</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  },
);

ReauthModal.displayName = "ReauthModal";
export default ReauthModal;
