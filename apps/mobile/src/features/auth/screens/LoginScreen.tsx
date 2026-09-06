import React, { useState, useCallback, memo } from "react";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image, ImageBackground } from "expo-image";
import auth from "@react-native-firebase/auth";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff } from "lucide-react-native";
import { GoogleIcon } from "@/src/components/icons/BrandIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import COLORS from "@/src/constants/colors";
import Constants from "expo-constants";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainApp: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const { GOOGLE_WEB_CLIENT_ID } = Constants.expoConfig?.extra ?? {};
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

// main

const LoginScreen: React.FC<LoginScreenProps> = memo(({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Centralised Firebase auth error handler — avoids duplicating toast logic
  const handleAuthError = useCallback(
    (error: { code?: string; message?: string }): void => {
      let errorMessage = t("common.error");

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage = t("auth.errors.invalidCredentials");
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = t("auth.errors.network");
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Too many failed attempts. Please wait a moment and try again.";
      }

      ToastAndroid.show(errorMessage, ToastAndroid.LONG);
    },
    [t],
  );

  // login handler for email/password sign-in

  const handleLogin = useCallback(async (): Promise<void> => {
    if (!email || !password) {
      ToastAndroid.show(
        `${t("common.error")}: ${t("auth.emptyFields")}`,
        ToastAndroid.LONG,
      );
      return;
    }
    setIsLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      navigation.replace("MainApp");
    } catch (error) {
      console.error("Login failed", error);
      handleAuthError(error as { code?: string });
    } finally {
      setIsLoading(false);
    }
  }, [email, password, t, handleAuthError, navigation]);

  // Google Sign-In handler

  const onGoogleButtonPress = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfoResponse = await GoogleSignin.signIn();
      const idToken = userInfoResponse.data?.idToken;

      if (!idToken) {
        // idToken missing — Google sign-in response incomplete
        return;
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
      navigation.replace("MainApp");
    } catch (error) {
      // Silently ignore user-cancelled sign-in; log unexpected errors
      if ((error as { code?: string }).code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error("Google sign-in error", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  // Anonymous / Guest login handler

  const handleAnonymousLogin = useCallback(async (): Promise<void> => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await auth().signInAnonymously();
      navigation.replace("MainApp");
    } catch (error) {
      console.error("Anonymous login failed", error);
      ToastAndroid.show(t("auth.errors.general"), ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, navigation, t]);

  const handleNavigateToForgotPassword = useCallback(() => {
    navigation.navigate("ForgotPassword");
  }, [navigation]);

  const handleNavigateToRegister = useCallback(() => {
    navigation.navigate("Register");
  }, [navigation]);

  return (
    <ImageBackground
      source={require("@/assets/background.webp")}
      style={styles.background}
      contentFit="cover"
      cachePolicy="memory-disk"
    >
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <Image
              source={require("@/assets/logo.webp")}
              style={styles.logo}
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling={true}
            />

            <CustomText style={styles.title}>{t("auth.login.title")}</CustomText>

            <View style={styles.inputContainer}>
              <CustomTextInput
                style={styles.input}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.passwordWrapper}>
                <CustomTextInput
                  style={styles.passwordInput}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                  <EyeOff size={22} color="#aaa" />
                ) : (
                  <Eye size={22} color="#aaa" />
                )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleNavigateToForgotPassword}
                style={styles.forgotPasswordButton}
              >
                <CustomText style={styles.forgotPasswordText}>
                  {t("auth.login.forgotPassword")}
                </CustomText>
              </TouchableOpacity>
            </View>

            {/* Email login button */}
            <TouchableOpacity
              onPress={handleLogin}
              style={[styles.button, isLoading && styles.buttonDisabled]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <CustomText style={styles.buttonText}>{t("auth.login.title")}</CustomText>
              )}
            </TouchableOpacity>

            {/* Google sign-in button */}
            <TouchableOpacity
              onPress={onGoogleButtonPress}
              style={[styles.googleButtonWrapper, isLoading && styles.buttonDisabled]}
              disabled={isLoading}
            >
              <LinearGradient
                colors={["#10574b", "#3174f1", "#e92d18", "#c38d0c"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <GoogleIcon size={28} fill="#fff" />
                    <CustomText style={styles.buttonText}>
                      {" "}
                      {t("auth.login.googleSignIn")}
                    </CustomText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Create new account button */}
            <TouchableOpacity
              onPress={handleNavigateToRegister}
              style={[styles.newAccButton, isLoading && styles.buttonDisabled]}
              disabled={isLoading}
            >
              <CustomText style={styles.buttonText}>
                {t("auth.login.createAccount")}
              </CustomText>
            </TouchableOpacity>

            {/* Continue as guest button */}
            <TouchableOpacity
              onPress={handleAnonymousLogin}
              style={styles.guestButton}
              disabled={isLoading}
            >
              <CustomText style={styles.guestButtonText}>
                {t("auth.guest") || "Continue as Guest"}
              </CustomText>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
});

LoginScreen.displayName = "LoginScreen";
export default LoginScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  keyboardView: { flex: 1 },
  logo: { width: 220, height: 220, alignSelf: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: { marginBottom: 25 },
  input: {
    color: "white",
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 5,
    marginBottom: 10,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    color: "white",
    padding: 15,
  },
  eyeButton: {
    padding: 4,
  },
  forgotPasswordButton: {},
  forgotPasswordText: { color: "#779bdd" },
  button: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonWrapper: { justifyContent: "center" },
  gradient: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  newAccButton: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 35,
  },
  guestButton: { marginVertical: 15, padding: 10, alignItems: "center" },
  guestButtonText: {
    color: "#779bdd",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
