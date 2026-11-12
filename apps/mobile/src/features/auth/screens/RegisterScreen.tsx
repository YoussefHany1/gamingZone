import React, { memo, useCallback, useRef } from "react";
import CustomText from "@/src/components/CustomText";
import CustomPicker from "@/src/components/CustomPicker";
import {
  View,
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
import { Flag, User, VenusAndMars } from "lucide-react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AuthLogo from "../components/AuthLogo";
import AuthPrimaryButton from "../components/AuthPrimaryButton";
import AuthGoogleButton from "../components/AuthGoogleButton";
import AuthDiscordButton from "../components/AuthDiscordButton";
import AuthOutlineButton from "../components/AuthOutlineButton";
import AuthGuestButton from "../components/AuthGuestButton";
import AuthEmailInput from "../components/AuthEmailInput";
import AuthInput from "../components/AuthInput";
import AuthPasswordInput from "../components/AuthPasswordInput";
import AuthPasswordStrength from "../components/AuthPasswordStrength";
import AuthDivider from "../components/AuthDivider";
import AuthLegalNotice from "../components/AuthLegalNotice";
import VerifyEmailModal from "../components/VerifyEmailModal";
import { useRegisterForm } from "../hooks/useRegisterForm";
import type { AuthScreenProps, Gender } from "../types";

const RegisterScreen: React.FC<AuthScreenProps<"Register">> = memo(({ navigation }) => {
  const { t } = useTranslation();
  const form = useRegisterForm({ navigation });

  // Field chaining: name → email → password (submit).
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const focusEmail = useCallback(() => emailRef.current?.focus(), []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
  const submitPassword = useCallback(() => form.handleSignup(), [form]);

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
    pickerWrap: { marginBottom: 10 },
    createAccountButton: { marginTop: 35 },
    discordButton: { marginTop: 15 },
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
        behavior={Platform.OS === "android" ? "height" : undefined}
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

                <CustomText style={styles.title}>{t("auth.register.title")}</CustomText>

                <View style={styles.inputContainer}>
                  <AuthInput
                    icon={User}
                    placeholder={t("auth.register.namePlaceholder")}
                    value={form.name}
                    onChangeText={form.setName}
                    onBlur={() => form.markTouched("name")}
                    error={form.errors.name}
                    returnKeyType="next"
                    onSubmitEditing={focusEmail}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    accessibilityLabel={t("auth.a11y.nameLabel")}
                    accessibilityHint={t("auth.a11y.nameHint")}
                  />

                  <AuthEmailInput
                    ref={emailRef}
                    placeholder={t("auth.emailPlaceholder")}
                    value={form.email}
                    onChangeText={form.setEmail}
                    onBlur={() => form.markTouched("email")}
                    error={form.errors.email}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={focusPassword}
                  />

                  <View style={styles.pickerWrap}>
                    <CustomPicker
                      icon={VenusAndMars}
                      options={form.genderOptions}
                      selectedValue={form.gender}
                      onValueChange={(val) => form.setGender(val as Gender)}
                      placeholder={
                        t("auth.register.genderPlaceholder") || "Select Gender"
                      }
                    />
                  </View>
                  <View style={styles.pickerWrap}>
                    <CustomPicker
                      icon={Flag}
                      options={form.countriesList}
                      selectedValue={form.country}
                      onValueChange={form.setCountry}
                      placeholder={
                        t("auth.register.countryPlaceholder") || "Select Country"
                      }
                    />
                  </View>

                  <AuthPasswordInput
                    ref={passwordRef}
                    value={form.password}
                    onChangeText={form.setPassword}
                    onBlur={() => form.markTouched("password")}
                    placeholder={t("auth.passwordPlaceholder")}
                    error={form.errors.password}
                    autoComplete="new-password"
                    returnKeyType="go"
                    onSubmitEditing={submitPassword}
                  />

                  <AuthPasswordStrength password={form.password} />
                </View>

                <AuthPrimaryButton
                  label={t("auth.register.signUpButton")}
                  onPress={form.handleSignup}
                  loading={form.isLoading}
                  disabled={form.isLoading}
                  accessibilityHint={t("auth.a11y.signUpHint")}
                />

                <AuthDivider />

                <AuthGoogleButton
                  label={t("auth.register.googleSignUp")}
                  onPress={form.handleGooglePress}
                  loading={form.isLoading}
                  disabled={form.isLoading}
                  accessibilityHint={t("auth.a11y.googleSignUpHint")}
                />

                <AuthDiscordButton
                  label={t("auth.register.discordSignUp")}
                  onPress={form.handleDiscordPress}
                  loading={form.isLoading}
                  disabled={form.isLoading}
                  accessibilityHint={t("auth.a11y.discordSignUpHint")}
                  containerStyle={styles.discordButton}
                />

                <AuthOutlineButton
                  label={t("auth.register.haveAnAccount")}
                  onPress={form.handleNavigateToLogin}
                  disabled={form.isLoading}
                  accessibilityHint={t("auth.a11y.haveAccountHint")}
                  containerStyle={styles.createAccountButton}
                />

                <AuthGuestButton
                  label={t("auth.guest") || "Continue as Guest"}
                  onPress={form.handleAnonymousLogin}
                  disabled={form.isLoading}
                  accessibilityHint={t("auth.a11y.guestHint")}
                />

                <AuthLegalNotice />
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <VerifyEmailModal
        visible={form.verify.visible}
        email={form.verify.email}
        isChecking={form.verify.isChecking}
        isResending={form.verify.isResending}
        resendCooldown={form.verify.resendCooldown}
        onCheckVerified={form.verify.handleCheckVerified}
        onResend={form.verify.handleResend}
        onSkip={form.verify.handleSkip}
      />
    </ImageBackground>
  );
});

RegisterScreen.displayName = "RegisterScreen";

export default RegisterScreen;
