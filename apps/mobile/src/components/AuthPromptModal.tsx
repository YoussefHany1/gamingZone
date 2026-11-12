import React from "react";
import { Modal, View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import CustomText from "./CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import PressScale from "./PressScale";

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

/**
 * Contextual auth gate shown when a guest triggers a protected action.
 * Dismissing clears any pending action (handled by the auth gate store).
 */
const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  visible,
  onDismiss,
  onSignIn,
  onSignUp,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    overlay: {
      flex: 1,
      backgroundColor: c.scrim,
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
      paddingBottom: 20,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: c.textMuted,
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
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
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
      color: c.onAccent,
    },
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <CustomText style={styles.title}>
              {t("common.authPrompt.title")}
            </CustomText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <CustomText style={styles.message}>
              {t("common.authPrompt.message")}
            </CustomText>
          </View>

          <View style={styles.actions}>
            <PressScale
              style={[styles.button, styles.signInButton]}
              onPress={onSignIn}
              accessibilityRole="button"
            >
              <CustomText style={styles.signInText}>
                {t("common.authPrompt.signIn")}
              </CustomText>
            </PressScale>
            <PressScale
              style={[styles.button, styles.signUpButton]}
              onPress={onSignUp}
              accessibilityRole="button"
            >
              <CustomText style={styles.signUpText}>
                {t("common.authPrompt.signUp")}
              </CustomText>
            </PressScale>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AuthPromptModal;

