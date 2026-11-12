import React, { memo, useCallback, useRef } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  type TextInput,
} from "react-native";
import { ImageBackground } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AuthLogo from "../components/AuthLogo";
import AuthPrimaryButton from "../components/AuthPrimaryButton";
import AuthGoogleButton from "../components/AuthGoogleButton";
import AuthDiscordButton from "../components/AuthDiscordButton";
import AuthOutlineButton from "../components/AuthOutlineButton";
import AuthGuestButton from "../components/AuthGuestButton";
import AuthEmailInput from "../components/AuthEmailInput";
import AuthPasswordInput from "../components/AuthPasswordInput";
import AuthDivider from "../components/AuthDivider";
import { useLoginForm } from "../hooks/useLoginForm";
import type { AuthScreenProps } from "../types";

const LoginScreen: React.FC<AuthScreenProps<"Login">> = memo(({ navigation }) => {
  const { t } = useTranslation();
  const {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    markTouched,
    isLoading,
    handleLogin,
    handleGooglePress,
    handleDiscordPress,
    handleAnonymousLogin,
    handleNavigateToForgotPassword,
    handleNavigateToRegister,
  } = useLoginForm({ navigation });

  // Field chaining: email → password (submit).
  const passwordRef = useRef<TextInput>(null);
  const submitPassword = useCallback(() => handleLogin(), [handleLogin]);

  const styles = useThemeStyles((c) => ({
    background: {
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor: c.background,
    },
    container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: "center" },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: c.text,
      textAlign: "center",
      marginBottom: 20,
    },
    inputContainer: { marginBottom: 25 },
    forgotPasswordText: { color: c.accentText },
    discordButton: { marginTop: 15 },
    createAccountButton: { marginTop: 35 },
  }));

  return (
    <ImageBackground
      source={require("@/assets/background.webp")}
      style={styles.background}
      contentFit="cover"
      cachePolicy="memory-disk"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "height" : undefined}
        style={styles.keyboardView}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View>
                <AuthLogo />

                <CustomText style={styles.title}>
                  {t("auth.login.title")}
                </CustomText>

                <View style={styles.inputContainer}>
                  <AuthEmailInput
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => markTouched("email")}
                    error={errors.email}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />

                  <AuthPasswordInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    onBlur={() => markTouched("password")}
                    placeholder={t("auth.passwordPlaceholder")}
                    error={errors.password}
                    autoComplete="current-password"
                    returnKeyType="go"
                    onSubmitEditing={submitPassword}
                  />

                  <TouchableOpacity
                    onPress={handleNavigateToForgotPassword}
                    accessibilityRole="link"
                    accessibilityLabel={t("auth.login.forgotPassword")}
                    accessibilityHint={t("auth.a11y.forgotPasswordHint")}
                  >
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
                  accessibilityHint={t("auth.a11y.signInHint")}
                />

                <AuthDivider />

                <AuthGoogleButton
                  label={t("auth.login.googleSignIn")}
                  onPress={handleGooglePress}
                  loading={isLoading}
                  disabled={isLoading}
                  accessibilityHint={t("auth.a11y.googleSignInHint")}
                />

                <AuthDiscordButton
                  label={t("auth.login.discordSignIn")}
                  onPress={handleDiscordPress}
                  loading={isLoading}
                  disabled={isLoading}
                  accessibilityHint={t("auth.a11y.discordSignInHint")}
                  containerStyle={styles.discordButton}
                />

                <AuthOutlineButton
                  label={t("auth.login.createAccount")}
                  onPress={handleNavigateToRegister}
                  disabled={isLoading}
                  accessibilityHint={t("auth.a11y.createAccountHint")}
                  containerStyle={styles.createAccountButton}
                />

                <AuthGuestButton
                  label={t("auth.guest") || "Continue as Guest"}
                  onPress={handleAnonymousLogin}
                  disabled={isLoading}
                  accessibilityHint={t("auth.a11y.guestHint")}
                />
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
});

LoginScreen.displayName = "LoginScreen";

export default LoginScreen;
