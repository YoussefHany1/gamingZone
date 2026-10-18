import React, { memo } from "react";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import {
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ImageBackground } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AuthLogo from "../components/AuthLogo";
import AuthPrimaryButton from "../components/AuthPrimaryButton";
import AuthGoogleButton from "../components/AuthGoogleButton";
import AuthOutlineButton from "../components/AuthOutlineButton";
import AuthGuestButton from "../components/AuthGuestButton";
import AuthPasswordInput from "../components/AuthPasswordInput";
import { useLoginForm } from "../hooks/useLoginForm";
import type { AuthScreenProps } from "../types";

const LoginScreen: React.FC<AuthScreenProps<"Login">> = memo(({ navigation }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleLogin,
    handleGooglePress,
    handleAnonymousLogin,
    handleNavigateToForgotPassword,
    handleNavigateToRegister,
  } = useLoginForm({ navigation });

  const styles = useThemeStyles((c) => ({
    background: {
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor: c.background,
    },
    container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
    keyboardView: { flex: 1 },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: c.text,
      textAlign: "center",
      marginBottom: 20,
    },
    inputContainer: { marginBottom: 25 },
    input: {
      color: c.text,
      backgroundColor: c.surface,
      padding: 15,
      borderRadius: 5,
      marginBottom: 10,
    },
    forgotPasswordText: { color: c.accentText },
    createAccountButton: { marginTop: 35 },
  }));

  return (
    <ImageBackground
      source={require("@/assets/background.webp")}
      style={styles.background}
      contentFit="cover"
      cachePolicy="memory-disk"
    >
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <AuthLogo />

            <CustomText style={styles.title}>{t("auth.login.title")}</CustomText>

            <View style={styles.inputContainer}>
              <CustomTextInput
                style={styles.input}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor={colors.textSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AuthPasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.passwordPlaceholder")}
              />

              <TouchableOpacity onPress={handleNavigateToForgotPassword}>
                <CustomText style={styles.forgotPasswordText}>
                  {t("auth.login.forgotPassword")}
                </CustomText>
              </TouchableOpacity>
            </View>

            <AuthPrimaryButton
              label={t("auth.login.title")}
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
            />

            <AuthGoogleButton
              label={t("auth.login.googleSignIn")}
              onPress={handleGooglePress}
              loading={isLoading}
              disabled={isLoading}
            />

            <AuthOutlineButton
              label={t("auth.login.createAccount")}
              onPress={handleNavigateToRegister}
              disabled={isLoading}
              containerStyle={styles.createAccountButton}
            />

            <AuthGuestButton
              label={t("auth.guest") || "Continue as Guest"}
              onPress={handleAnonymousLogin}
              disabled={isLoading}
            />
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
});

LoginScreen.displayName = "LoginScreen";

export default LoginScreen;
