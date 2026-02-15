import React, { useState } from "react";
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
import COLORS from "../constants/colors";
import Constants from "expo-constants";

const { GOOGLE_WEB_CLIENT_ID } = Constants.expoConfig.extra;

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuthError = (error, t) => {
    let errorMessage = t("common.error"); // الرسالة الافتراضية

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
        "تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار قليلاً.";
    }

    ToastAndroid.show(errorMessage, ToastAndroid.LONG);
  };

  // --- دالة تسجيل الدخول بالبريد الإلكتروني ---
  const handleLogin = async () => {
    if (!email || !password) {
      ToastAndroid.show(
        `${t("common.error")}: ${t("auth.emptyFields")}`,
        ToastAndroid.LONG,
      );
      return;
    }
    try {
      await auth().signInWithEmailAndPassword(email, password);
      console.log(`${t("auth.login.success")})`);

      // 👇 التعديل هنا: التوجيه بعد النجاح
      navigation.replace("MainApp");
    } catch (error) {
      console.error("Login failed", error);
      handleAuthError(error, t);
    }
  };

  // --- دالة تسجيل الدخول بجوجل ---
  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfoResponse = await GoogleSignin.signIn();
      const idToken = userInfoResponse.data?.idToken;

      if (!idToken) {
        // ... (Error handling code)
        return;
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);

      // 👇 التعديل هنا: التوجيه بعد النجاح
      navigation.replace("MainApp");
    } catch (error) {
      // ... (Error handling code)
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      await auth().signInAnonymously();

      // 👇 التعديل هنا: التوجيه بعد النجاح
      navigation.replace("MainApp");
    } catch (error) {
      console.error("Anonymous login failed", error);
      ToastAndroid.show(t("auth.errors.general"), ToastAndroid.LONG);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.background}
      resizeMode="cover"
      allowDownscaling={true}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
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
              {/* Email Input */}
              <TextInput
                style={styles.input}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Password Input */}
              <TextInput
                style={styles.input}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Forgot Password Button */}
              <TouchableOpacity
                onPress={() => navigation.navigate("ForgotPassword")}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>
                  {t("auth.login.forgotPassword")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity onPress={handleLogin} style={styles.button}>
              <Text style={styles.buttonText}>{t("auth.login.title")}</Text>
            </TouchableOpacity>

            {/* Google Sign In Button */}
            <TouchableOpacity
              onPress={onGoogleButtonPress}
              style={{
                textAlign: "center",
                justifyContent: "center",
              }}
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
            {/* Create Account Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              style={styles.newAccButton}
            >
              <Text style={styles.buttonText}>
                {t("auth.login.createAccount")}
              </Text>
            </TouchableOpacity>
            {/* Continue as Guest Button */}
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
}

export default LoginScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 220,
    height: 220,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 25,
  },
  input: {
    color: "white",
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  forgotPasswordButton: {},
  forgotPasswordText: {
    color: "#779bdd",
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
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
    textAlign: "center",
    justifyContent: "center",
    marginTop: 35,
  },
  guestButton: {
    marginVertical: 15,
    padding: 10,
    alignItems: "center",
  },
  guestButtonText: {
    color: "#779bdd",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
