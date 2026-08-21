import React, { useState, useCallback, memo } from "react";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import {
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import auth from "@react-native-firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import COLORS from "@/src/constants/colors";

// Types
type AuthStackParamList = {
  ForgotPassword: undefined;
  Login: undefined;
};
type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

// main
const ForgotPasswordScreen = memo(({ navigation }: Props) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleResetPassword = useCallback(async (): Promise<void> => {
    if (!email) {
      ToastAndroid.show(t("auth.forgotPassword.emptyEmail"), ToastAndroid.LONG);
      return;
    }

    setLoading(true);
    try {
      // Check if the email is registered before sending the reset link
      const signInMethods = await auth().fetchSignInMethodsForEmail(email);
      if (signInMethods.length === 0) {
        ToastAndroid.show(
          t("auth.forgotPassword.errors.userNotFound"),
          ToastAndroid.LONG,
        );
        return;
      }

      await auth().sendPasswordResetEmail(email);
      ToastAndroid.show(
        t("auth.forgotPassword.successTitle"),
        ToastAndroid.LONG,
      );
      navigation.goBack();
    } catch (error: unknown) {
      console.error("[ForgotPasswordScreen] Reset error:", error);
      const code = (error as { code?: string }).code;
      const key =
        code === "auth/invalid-email"
          ? "auth.forgotPassword.errors.userNotFound"
          : "auth.forgotPassword.errors.general";
      ToastAndroid.show(t(key), ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  }, [email, navigation, t]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ImageBackground
      source={require("@/assets/background.webp")}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <SafeAreaView style={styles.container}>
          {/* Logo */}
          <Image
            source={require("@/assets/logo.webp")}
            style={styles.logo}
            contentFit="cover"
            transition={500}
            cachePolicy="memory-disk"
            allowDownscaling
          />
          {/* Title */}
          <CustomText style={styles.title}>{t("auth.forgotPassword.title")}</CustomText>

          {/* Email Input */}
          <CustomTextInput
            style={styles.input}
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {/* Send Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <CustomText style={styles.buttonText}>
              {t("auth.forgotPassword.sendButton")}
            </CustomText>
          </TouchableOpacity>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <CustomText style={styles.buttonText}>
              {t("auth.forgotPassword.backToLogin")}
            </CustomText>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
});

ForgotPasswordScreen.displayName = "ForgotPasswordScreen";
export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  container: { flex: 1, justifyContent: "center", padding: 20 },
  logo: { width: 250, height: 250, alignSelf: "center" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    color: "white",
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    padding: 15,
    borderRadius: 5,
    marginBottom: 25,
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    marginHorizontal: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  backButton: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
