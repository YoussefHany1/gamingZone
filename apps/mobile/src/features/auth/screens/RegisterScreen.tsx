import React, { memo } from "react";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import CustomPicker from "@/src/components/CustomPicker";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
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
import VerifyEmailModal from "../components/VerifyEmailModal";
import { useRegisterForm } from "../hooks/useRegisterForm";
import type { AuthScreenProps, Gender } from "../types";

const RegisterScreen: React.FC<AuthScreenProps<"Register">> = memo(
  ({ navigation }) => {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const form = useRegisterForm({ navigation });

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
      input: {
        color: c.text,
        backgroundColor: c.surface,
        fontSize: 14,
        padding: 15,
        borderRadius: 5,
        marginBottom: 10,
      },
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
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView style={styles.container}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <AuthLogo />

              <CustomText style={styles.title}>
                {t("auth.register.title")}
              </CustomText>

              <View style={styles.inputContainer}>
                <CustomTextInput
                  style={styles.input}
                  placeholder={t("auth.register.namePlaceholder")}
                  value={form.name}
                  onChangeText={form.setName}
                  placeholderTextColor={colors.textSubtle}
                />
                <CustomTextInput
                  style={styles.input}
                  placeholder={t("auth.emailPlaceholder")}
                  value={form.email}
                  onChangeText={form.setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textSubtle}
                />

                <CustomPicker
                  options={form.genderOptions}
                  selectedValue={form.gender}
                  onValueChange={(val) => form.setGender(val as Gender)}
                  placeholder={
                    t("auth.register.genderPlaceholder") || "Select Gender"
                  }
                />
                <CustomPicker
                  options={form.countriesList}
                  selectedValue={form.country}
                  onValueChange={form.setCountry}
                  placeholder={
                    t("auth.register.countryPlaceholder") || "Select Country"
                  }
                />

                <CustomTextInput
                  style={styles.input}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={form.password}
                  onChangeText={form.setPassword}
                  secureTextEntry
                  placeholderTextColor={colors.textSubtle}
                />
              </View>

              <AuthPrimaryButton
                label={t("auth.register.signUpButton")}
                onPress={form.handleSignup}
                loading={form.isLoading}
                disabled={form.isLoading}
              />

              <AuthGoogleButton
                label={t("auth.register.googleSignUp")}
                onPress={form.handleGooglePress}
                loading={form.isLoading}
                disabled={form.isLoading}
              />

              <AuthOutlineButton
                label={t("auth.register.haveAnAccount")}
                onPress={form.handleNavigateToLogin}
                disabled={form.isLoading}
                containerStyle={styles.createAccountButton}
              />

              <AuthGuestButton
                label={t("auth.guest") || "Continue as Guest"}
                onPress={form.handleAnonymousLogin}
                disabled={form.isLoading}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>

        <VerifyEmailModal
          visible={form.verify.visible}
          email={form.verify.email}
          isChecking={form.verify.isChecking}
          isResending={form.verify.isResending}
          onCheckVerified={form.verify.handleCheckVerified}
          onResend={form.verify.handleResend}
          onSkip={form.verify.handleSkip}
        />
      </ImageBackground>
    );
  },
);

RegisterScreen.displayName = "RegisterScreen";

export default RegisterScreen;
