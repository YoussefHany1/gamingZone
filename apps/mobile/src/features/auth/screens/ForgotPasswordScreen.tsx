import React, { memo } from "react";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { KeyboardAvoidingView, Platform } from "react-native";
import { ImageBackground } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AuthLogo from "../components/AuthLogo";
import AuthPrimaryButton from "../components/AuthPrimaryButton";
import AuthOutlineButton from "../components/AuthOutlineButton";
import { useForgotPasswordForm } from "../hooks/useForgotPasswordForm";
import type { AuthScreenProps } from "../types";

const ForgotPasswordScreen: React.FC<AuthScreenProps<"ForgotPassword">> = memo(
  ({ navigation }) => {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { email, setEmail, loading, handleResetPassword, handleGoBack } =
      useForgotPasswordForm({ navigation });

    const styles = useThemeStyles((c) => ({
      background: {
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: c.background,
      },
      keyboardView: { flex: 1 },
      container: { flex: 1, justifyContent: "center", padding: 20 },
      title: {
        fontSize: 22,
        fontWeight: "bold",
        color: c.text,
        textAlign: "center",
        marginBottom: 20,
      },
      input: {
        color: c.text,
        backgroundColor: c.surface,
        padding: 15,
        borderRadius: 5,
        marginBottom: 25,
      },
      sendButton: {
        marginBottom: 20,
        marginHorizontal: 10,
      },
    }));

    return (
      <ImageBackground
        source={require("@/assets/background.webp")}
        style={styles.background}
        contentFit="cover"
        cachePolicy="memory-disk"
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "android" ? "height" : "padding"}
        >
          <SafeAreaView style={styles.container}>
            <AuthLogo size={250} />

            <CustomText style={styles.title}>
              {t("auth.forgotPassword.title")}
            </CustomText>

            <CustomTextInput
              style={styles.input}
              placeholder={t("auth.emailPlaceholder")}
              placeholderTextColor={colors.textSubtle}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <AuthPrimaryButton
              label={t("auth.forgotPassword.sendButton")}
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading}
              containerStyle={styles.sendButton}
            />

            <AuthOutlineButton
              label={t("auth.forgotPassword.backToLogin")}
              onPress={handleGoBack}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </ImageBackground>
    );
  },
);

ForgotPasswordScreen.displayName = "ForgotPasswordScreen";

export default ForgotPasswordScreen;
