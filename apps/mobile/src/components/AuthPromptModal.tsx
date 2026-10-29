import React, { useCallback, useState } from "react";
import { Modal, View, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import CustomText from "./CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { storage } from "@/src/lib/storage";
import { logger } from "@/src/lib/logger";

const HIDE_KEY = "hide_auth_prompt";

interface AuthPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  /**
   * The modal renders outside the `NavigationContainer`, so a hook cannot reach
   * the navigator. The owner passes the destination instead.
   */
  onSignIn?: () => void;
  onSignUp?: () => void;
}

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  visible,
  onDismiss,
  onSignIn,
  onSignUp,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const styles = useThemeStyles((c) => ({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    container: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: c.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      flex: 1,
      paddingRight: 12,
    },
    closeButton: {
      padding: 4,
    },
    body: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: c.textMuted,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    checkboxChecked: {
      backgroundColor: c.accent,
    },
    checkboxInner: {
      width: 10,
      height: 10,
      borderRadius: 2,
      backgroundColor: c.background,
    },
    checkboxLabel: {
      fontSize: 13,
      color: c.textMuted,
      flex: 1,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    signInButton: {
      // backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    signUpButton: {
      backgroundColor: c.accent,
    },
    signInText: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    signUpText: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
  }));

  const handleDismiss = useCallback(() => {
    try {
      if (dontShowAgain) {
        storage.set(HIDE_KEY, "true");
      }
    } catch (e) {
      logger.warn("[AuthPromptModal] Failed to persist preference:", e);
    }
    onDismiss();
  }, [dontShowAgain, onDismiss]);

  const handleSignIn = useCallback(() => {
    try {
      if (dontShowAgain) {
        storage.set(HIDE_KEY, "true");
      }
    } catch (e) {
      logger.warn("[AuthPromptModal] Failed to persist preference:", e);
    }
    onDismiss();
    onSignIn?.();
  }, [dontShowAgain, onSignIn, onDismiss]);

  const handleSignUp = useCallback(() => {
    try {
      if (dontShowAgain) {
        storage.set(HIDE_KEY, "true");
      }
    } catch (e) {
      logger.warn("[AuthPromptModal] Failed to persist preference:", e);
    }
    onDismiss();
    onSignUp?.();
  }, [dontShowAgain, onSignUp, onDismiss]);

  const toggleCheckbox = useCallback(() => {
    setDontShowAgain((prev) => !prev);
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <CustomText style={styles.title}>{t("common.authPrompt.title")}</CustomText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <CustomText style={styles.message}>
              {t("common.authPrompt.message")}
            </CustomText>
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={toggleCheckbox}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
              {dontShowAgain && <View style={styles.checkboxInner} />}
            </View>
            <CustomText style={styles.checkboxLabel}>
              {t("common.authPrompt.dontShowAgain")}
            </CustomText>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.signInButton]}
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <CustomText style={styles.signInText}>
                {t("common.authPrompt.signIn")}
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.signUpButton]}
              onPress={handleSignUp}
              activeOpacity={0.8}
            >
              <CustomText style={styles.signUpText}>
                {t("common.authPrompt.signUp")}
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AuthPromptModal;
