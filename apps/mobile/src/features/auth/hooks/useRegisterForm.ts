import { useCallback, useMemo, useState } from "react";
import { ToastAndroid } from "react-native";
import auth, { EmailAuthProvider } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import analytics from "@react-native-firebase/analytics";
import { useTranslation } from "react-i18next";
import { useAuthErrorMessages } from "./useAuthErrorMessages";
import { useAuthValidation } from "./useAuthValidation";
import { normalizeEmail } from "../lib/validation";
import { useGoogleAuth } from "./useGoogleAuth";
import { useDiscordAuth } from "./useDiscordAuth";
import { useAnonymousAuth } from "./useAnonymousAuth";
import { useVerifyEmail } from "./useVerifyEmail";
import type { UseVerifyEmailResult } from "./useVerifyEmail";
import { useCountryOptions } from "./useCountryOptions";
import type { AuthNavigationProp, AuthPickerOption, Gender } from "../types";
import { useAuthStore } from "@/src/store/useAuthStore";
import { claimGeneratedHandle } from "@/src/features/social/lib/profileService";
import { toDisplayNameKey, toEmailKey } from "@/src/lib/searchKeys";
import { logger } from "@/src/lib/logger";

export type UseRegisterFormParams = {
  navigation: AuthNavigationProp<"Register">;
};

/** Fields that participate in inline validation. */
export type RegisterField = "name" | "email" | "password";

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
  /**
   * Inline validation errors, shown once a field was blurred or a submit was
   * attempted. `null` means valid (or not yet eligible to show).
   */
  errors: Record<RegisterField, string | null>;
  /** Marks a field as touched (called on blur). */
  markTouched: (field: RegisterField) => void;
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
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  /** Server-side email failures (already in use) shown on the email field. */
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const messages = useAuthErrorMessages();
  const validators = useAuthValidation();
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

  const markTouched = useCallback((field: RegisterField): void => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const setNameValue = useCallback((value: string) => setName(value), []);
  const setEmailValue = useCallback((value: string) => {
    // Trim on every edit so copy/pasted addresses never reach the API with
    // leading/trailing whitespace.
    setEmail(normalizeEmail(value));
    // Clear any stale server error once the user edits the address.
    setEmailServerError(null);
  }, []);
  const setPasswordValue = useCallback(
    (value: string) => setPassword(value),
    [],
  );

  /** Inline errors, revealed after blur or first submit attempt. */
  const errors = useMemo(() => {
    const show = (field: RegisterField) =>
      touched[field] || submitted ? true : false;
    return {
      name: show("name") ? validators.validateName(name) : null,
      email:
        emailServerError ??
        (show("email") ? validators.validateEmail(normalizeEmail(email)) : null),
      password: show("password") ? validators.validatePassword(password) : null,
    };
  }, [touched, submitted, name, email, password, emailServerError, validators]);

  const handleSignup = useCallback(async (): Promise<void> => {
    setSubmitted(true);

    // Normalise again at submit time in case the value was set programmatically
    // or autofilled without passing through `onChangeText`.
    const normalizedEmail = normalizeEmail(email);
    setEmail(normalizedEmail);

    // Client-side validation: surfaced inline via `errors`, so only bail out.
    if (
      validators.validateName(name) ||
      validators.validateEmail(normalizedEmail) ||
      validators.validatePassword(password)
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const currentUser = auth().currentUser;
      let user = currentUser;

      if (currentUser?.isAnonymous) {
        // Link the anonymous guest account to preserve UID and any local-first state.
        const credential = EmailAuthProvider.credential(
          normalizedEmail,
          password,
        );
        const result = await currentUser.linkWithCredential(credential);
        user = result.user;
        try {
          await analytics().logEvent("guest_link_success", { method: "email" });
        } catch {
          // non-fatal
        }
      } else {
        const result = await auth().createUserWithEmailAndPassword(
          normalizedEmail,
          password,
        );
        user = result.user;
      }

      if (!user) {
        throw new Error("No user after sign up");
      }

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

      // Store additional user profile data in Firestore (merge-safe for linked guests).
      await firestore().collection("users").doc(user.uid).set(
        {
          uid: user.uid,
          displayName: name,
          // Normalized mirrors power the admin dashboard's prefix search.
          displayNameLower: toDisplayNameKey(name),
          email: normalizedEmail,
          emailLower: toEmailKey(normalizedEmail),
          country,
          gender,
          photoURL: user.photoURL ?? null,
          phoneNumber: user.phoneNumber ?? null,
          createdAt: firestore.FieldValue.serverTimestamp(),
          platform: "",
          dob: "",
        },
        { merge: true },
      );

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
      openVerification(normalizedEmail);
    } catch (error) {
      logger.error("Sign up failed:", error);
      const code = (error as { code?: string }).code;
      // Field-anchored server errors go inline; everything else stays a toast.
      if (
        code === "auth/email-already-in-use" ||
        code === "auth/invalid-email"
      ) {
        setEmailServerError(messages.signup(code));
      } else {
        ToastAndroid.show(messages.signup(code), ToastAndroid.LONG);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    name,
    email,
    password,
    country,
    gender,
    validators,
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
    errors,
    markTouched,
    isLoading,
    handleSignup,
    handleGooglePress,
    handleDiscordPress,
    handleAnonymousLogin,
    handleNavigateToLogin,
    verify,
  };
}
