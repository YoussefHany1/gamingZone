import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  ToastAndroid,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import COLORS from "../constants/colors";
import CustomPicker from "../components/CustomPicker";
import { getLocales } from "expo-localization";
import countries from "i18n-iso-countries";
import enLang from "i18n-iso-countries/langs/en.json";
import arLang from "i18n-iso-countries/langs/ar.json";

countries.registerLocale(enLang);
countries.registerLocale(arLang);

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainApp: undefined;
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Register"
>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

type Gender = "male" | "female";

interface PickerOption {
  label: string;
  value: string;
}

// Countries excluded from the picker
const EXCLUDED_COUNTRIES = ["IL"] as const;

// Setup

const { GOOGLE_WEB_CLIENT_ID } = Constants.expoConfig?.extra ?? {};
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

// main

const SignupScreen: React.FC<RegisterScreenProps> = memo(({ navigation }) => {
  const { t, i18n } = useTranslation();

  const deviceCountryCode = getLocales()[0]?.regionCode ?? "";

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [country, setCountry] = useState<string>(deviceCountryCode);
  const [gender, setGender] = useState<Gender>("male");

  // Derived data

  /** Rebuild the country list only when the app language changes */
  const countriesList = useMemo<PickerOption[]>(() => {
    const langCode = i18n.language.startsWith("ar") ? "ar" : "en";
    const countriesObj = countries.getNames(langCode, { select: "official" });

    return Object.entries(countriesObj)
      .filter(([code]) => !EXCLUDED_COUNTRIES.includes(code as never))
      .map(([code, label]) => ({ label, value: code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [i18n.language]);

  const genderOptions = useMemo<PickerOption[]>(
    () => [
      { label: t("auth.register.male") || "Male", value: "male" },
      { label: t("auth.register.female") || "Female", value: "female" },
    ],
    [t]
  );

  // password Validation 

  /** Returns an error message string, or null if the password is valid */
  const validatePassword = useCallback(
    (pass: string): string | null => {
      if (pass.length < 8 || !/[a-z]/.test(pass) || !/[0-9]/.test(pass)) {
        return t("auth.validation.passwordRequirements");
      }
      return null;
    },
    [t]
  );

  // Email / Password sign-up handler

  const handleSignup = useCallback(async (): Promise<void> => {
    if (!email || !password || !name) {
      ToastAndroid.show(
        `${t("common.error")}: ${t("auth.register.emptyFields")}`,
        ToastAndroid.LONG
      );
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert(t("auth.validation.passwordTitle"), passwordError);
      return;
    }

    try {
      const { user } = await auth().createUserWithEmailAndPassword(
        email,
        password
      );

      await user.updateProfile({ displayName: name });

      // Store additional user profile data in Firestore
      await firestore().collection("users").doc(user.uid).set({
        uid: user.uid,
        displayName: name,
        email,
        country,
        gender,
        photoURL: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        platform: "",
        dob: "",
      });

      navigation.replace("MainApp");
    } catch (error) {
      console.error("Sign up failed:", error);
      const err = error as { code?: string };
      let msg = t("auth.errors.general");

      if (err.code === "auth/email-already-in-use") {
        msg = t("auth.errors.emailAlreadyInUse");
      } else if (err.code === "auth/weak-password") {
        msg = t("auth.errors.weakPassword");
      } else if (err.code === "auth/invalid-email") {
        msg = t("auth.errors.invalidEmail");
      }

      ToastAndroid.show(msg, ToastAndroid.LONG);
    }
  }, [email, password, name, country, gender, t, validatePassword, navigation]);

  // Google Sign-Up handler

  const onGoogleButtonPress = useCallback(async (): Promise<void> => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfoResponse = await GoogleSignin.signIn();
      const idToken = userInfoResponse.data?.idToken;

      if (!idToken) {
        console.error(
          "Google sign-up error: idToken missing in response.",
          JSON.stringify(userInfoResponse)
        );
        ToastAndroid.show(t("auth.idTokenError"), ToastAndroid.LONG);
        return;
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
      navigation.replace("MainApp");
    } catch (error) {
      console.error("Google sign-up error:", error);
      if ((error as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — no action required
      } else {
        ToastAndroid.show(t("auth.errors.general"), ToastAndroid.LONG);
      }
    }
  }, [navigation, t]);

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

  const handleNavigateToLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
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

            <Text style={styles.title}>{t("auth.register.title")}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t("auth.register.namePlaceholder")}
                value={name}
                onChangeText={setName}
                placeholderTextColor="#ccc"
              />
              <TextInput
                style={styles.input}
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <CustomPicker
                options={genderOptions}
                selectedValue={gender}
                onValueChange={(val) => setGender(val as Gender)}
                placeholder={
                  t("auth.register.genderPlaceholder") || "Select Gender"
                }
              />
              <CustomPicker
                options={countriesList}
                selectedValue={country}
                onValueChange={setCountry}
                placeholder={
                  t("auth.register.countryPlaceholder") || "Select Country"
                }
              />

              <TextInput
                style={styles.input}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Email sign-up button */}
            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>
                {t("auth.register.signUpButton")}
              </Text>
            </TouchableOpacity>

            {/* Google sign-up button */}
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
                  {t("auth.register.googleSignUp")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Already have an account button */}
            <TouchableOpacity
              style={styles.newAccButton}
              onPress={handleNavigateToLogin}
            >
              <Text style={styles.buttonText}>
                {t("auth.register.haveAnAccount")}
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

SignupScreen.displayName = "SignupScreen";

export default SignupScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: { marginBottom: 25 },
  input: {
    color: COLORS.textLight,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    fontSize: 14,
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
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
  googleButtonWrapper: { justifyContent: "center", },
  gradient: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: COLORS.textLight,
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