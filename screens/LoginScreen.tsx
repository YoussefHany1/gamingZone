import React, { useState, useCallback, memo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ToastAndroid,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import auth from "@react-native-firebase/auth";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import COLORS from "../constants/colors";
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
    [t]
  );

  // login handler for email/password sign-in

  const handleLogin = useCallback(async (): Promise<void> => {
    if (!email || !password) {
      ToastAndroid.show(
        `${t("common.error")}: ${t("auth.emptyFields")}`,
        ToastAndroid.LONG
      );
      return;
    }
    try {
      await auth().signInWithEmailAndPassword(email, password);
      navigation.replace("MainApp");
    } catch (error) {
      console.error("Login failed", error);
      handleAuthError(error as { code?: string });
    }
  }, [email, password, t, handleAuthError, navigation]);

  // Google Sign-In handler

  const onGoogleButtonPress = useCallback(async (): Promise<void> => {
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
    }
  }, [navigation]);

  // Anonymous / Guest login handler

  const handleAnonymousLogin = useCallback(async (): Promise<void> => {
    try {
      await auth().signInAnonymously();
      navigation.replace("MainApp");
    } catch (error) {
      console.error("Anonymous login failed", error);
      ToastAndroid.show(t("auth.errors.general"), ToastAndroid.LONG);
    }
  }, [navigation, t]);

  const handleNavigateToForgotPassword = useCallback(() => {
    navigation.navigate("ForgotPassword");
  }, [navigation]);

  const handleNavigateToRegister = useCallback(() => {
    navigation.navigate("Register");
  }, [navigation]);

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo}
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling={true}
            />

            <Text style={styles.title}>{t("auth.login.title")}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                onPress={handleNavigateToForgotPassword}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>
                  {t("auth.login.forgotPassword")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email login button */}
            <TouchableOpacity onPress={handleLogin} style={styles.button}>
              <Text style={styles.buttonText}>{t("auth.login.title")}</Text>
            </TouchableOpacity>

            {/* Google sign-in button */}
            <TouchableOpacity
              onPress={onGoogleButtonPress}
              style={styles.googleButtonWrapper}
            >
              <LinearGradient
                colors={["#10574b", "#3174f1", "#e92d18", "#c38d0c"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="logo-google" size={28} color="white" />
                <Text style={styles.buttonText}>
                  {" "}
                  {t("auth.login.googleSignIn")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Create new account button */}
            <TouchableOpacity
              onPress={handleNavigateToRegister}
              style={styles.newAccButton}
            >
              <Text style={styles.buttonText}>
                {t("auth.login.createAccount")}
              </Text>
            </TouchableOpacity>

            {/* Continue as guest button */}
            <TouchableOpacity
              onPress={handleAnonymousLogin}
              style={styles.guestButton}
            >
              <Text style={styles.guestButtonText}>
                {t("auth.guest") || "Continue as Guest"}
              </Text>
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
  googleButtonWrapper: { justifyContent: "center", },
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