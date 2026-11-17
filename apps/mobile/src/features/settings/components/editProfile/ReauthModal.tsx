import React, { memo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    disabled && styles.buttonDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={onSubmitPassword}
                  disabled={disabled}
                  accessibilityRole="button"
                  android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onAccent} size="small" />
                  ) : (
                    <CustomText style={styles.primaryBtnText}>
                      {t("settings.deleteAccount.verifyAndDelete")}
                    </CustomText>
                  )}
                </Pressable>
              ) : null}

              {method === "google" ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    disabled && styles.buttonDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={onVerifyWithGoogle}
                  disabled={disabled}
                  accessibilityRole="button"
                  android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <CustomText style={styles.secondaryBtnText}>
                      {t("settings.deleteAccount.verifyWithGoogle")}
                    </CustomText>
                  )}
                </Pressable>
              ) : null}

              {method === "discord" ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    disabled && styles.buttonDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={onVerifyWithDiscord}
                  disabled={disabled}
                  accessibilityRole="button"
                  android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <CustomText style={styles.secondaryBtnText}>
                      {t("settings.deleteAccount.verifyWithDiscord")}
                    </CustomText>
                  )}
                </Pressable>
              ) : null}

              {method === "password" && showDiscordAlternative ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.discordLink,
                    disabled && styles.buttonDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={onVerifyWithDiscord}
                  disabled={disabled}
                  accessibilityRole="button"
                  android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                >
                  <CustomText style={styles.discordLinkText}>
                    {t("settings.deleteAccount.discordAlternative")}
                  </CustomText>
                </Pressable>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  disabled && styles.buttonDisabled,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={onCancel}
                disabled={disabled}
                accessibilityRole="button"
                android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
              >
                <CustomText style={styles.cancelText}>{t("common.cancel")}</CustomText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  },
);

ReauthModal.displayName = "ReauthModal";
export default ReauthModal;
