import { useCallback, useMemo, useState } from "react";
import { Alert, ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { useAuthErrorMessages } from "./useAuthErrorMessages";
import { useGoogleAuth } from "./useGoogleAuth";
import { useDiscordAuth } from "./useDiscordAuth";
import { useAnonymousAuth } from "./useAnonymousAuth";
import { useVerifyEmail } from "./useVerifyEmail";
import type { UseVerifyEmailResult } from "./useVerifyEmail";
import { useCountryOptions } from "./useCountryOptions";
import type { AuthNavigationProp, AuthPickerOption, Gender } from "../types";
import { useAuthStore } from "@/src/store/useAuthStore";
import { claimGeneratedHandle } from "@/src/features/social/lib/profileService";
import { logger } from "@/src/lib/logger";

export type UseRegisterFormParams = {
  navigation: AuthNavigationProp<"Register">;
};

export type UseRegisterFormResult = {
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  gender: Gender;
  setGender: (gender: Gender) => void;
  country: string;
  setCountry: (code: string) => void;
  countriesList: AuthPickerOption[];
  genderOptions: AuthPickerOption[];
  isLoading: boolean;
  handleSignup: () => Promise<void>;
  handleGooglePress: () => Promise<void>;
  handleDiscordPress: () => Promise<void>;
  handleAnonymousLogin: () => Promise<void>;
  handleNavigateToLogin: () => void;
  /** State + handlers for the post-signup verification modal. */
  verify: UseVerifyEmailResult;
};

/** Form state + sign-up flows for the Register screen. */
export function useRegisterForm({
  navigation,
}: UseRegisterFormParams): UseRegisterFormResult {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [isLoading, setIsLoading] = useState(false);
  const messages = useAuthErrorMessages();
  const { country, setCountry, countriesList } = useCountryOptions();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  const goToApp = useCallback(() => {
    navigation.replace("MainApp");
  }, [navigation]);

  const verify = useVerifyEmail({ onVerified: goToApp, onSkip: goToApp });
  const { open: openVerification } = verify;

  const genderOptions = useMemo<AuthPickerOption[]>(
    () => [
      { label: t("auth.register.male") || "Male", value: "male" },
      { label: t("auth.register.female") || "Female", value: "female" },
    ],
    [t],
  );

  /** Returns an error message string, or null if the password is valid */
  const validatePassword = useCallback(
    (pass: string): string | null => {
      if (pass.length < 8 || !/[a-z]/.test(pass) || !/[0-9]/.test(pass)) {
        return t("auth.validation.passwordRequirements");
      }
      return null;
    },
    [t],
  );

  const handleSignup = useCallback(async (): Promise<void> => {
    if (!email || !password || !name) {
      ToastAndroid.show(
        `${t("common.error")}: ${t("auth.register.emptyFields")}`,
        ToastAndroid.LONG,
      );
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert(t("auth.validation.passwordTitle"), passwordError);
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await auth().createUserWithEmailAndPassword(email, password);

      await user.updateProfile({ displayName: name });

      // updateProfile only emits `onUserChanged`, not `onAuthStateChanged`, so
      // the store's snapshot keeps the old (empty) displayName until refreshed.
      refreshUser();

      // Send email verification
      try {
        await user.sendEmailVerification();
      } catch (e) {
        logger.warn("Failed to send verification email:", e);
      }

      // Store additional user profile data in Firestore
      await firestore().collection("users").doc(user.uid).set({
        uid: user.uid,
        displayName: name,
        email,
        country,
        gender,
        photoURL: null,
        phoneNumber: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        platform: "",
        dob: "",
      });

      // Claim the handle + create `profiles/{uid}`. Best-effort: a backend
      // outage must not lose the account (useProfileBootstrap retries on the
      // next session).
      try {
        await claimGeneratedHandle(name, user.uid);
      } catch (error) {
        logger.warn("Handle bootstrap failed during registration:", error);
      }

      // Ask the user to verify their email. This is optional — the modal
      // offers a "Continue" action that enters the app without verifying.
      openVerification(email);
    } catch (error) {
      logger.error("Sign up failed:", error);
      ToastAndroid.show(
        messages.signup((error as { code?: string }).code),
        ToastAndroid.LONG,
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    email,
    password,
    name,
    country,
    gender,
    t,
    validatePassword,
    messages,
    openVerification,
    refreshUser,
  ]);

  const handleGooglePress = useGoogleAuth({
    isLoading,
    setLoading: setIsLoading,
    onSuccess: goToApp,
  });

  const handleDiscordPress = useDiscordAuth({
    isLoading,
    setLoading: setIsLoading,
    onSuccess: goToApp,
  });

  const handleAnonymousLogin = useAnonymousAuth({
    isLoading,
    setLoading: setIsLoading,
    onSuccess: goToApp,
  });

  const handleNavigateToLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  const setNameValue = useCallback((value: string) => setName(value), []);
  const setEmailValue = useCallback((value: string) => setEmail(value), []);
  const setPasswordValue = useCallback((value: string) => setPassword(value), []);

  return {
    name,
    setName: setNameValue,
    email,
    setEmail: setEmailValue,
    password,
    setPassword: setPasswordValue,
    gender,
    setGender,
    country,
    setCountry,
    countriesList,
    genderOptions,
    isLoading,
    handleSignup,
    handleGooglePress,
    handleDiscordPress,
    handleAnonymousLogin,
    handleNavigateToLogin,
    verify,
  };
}
