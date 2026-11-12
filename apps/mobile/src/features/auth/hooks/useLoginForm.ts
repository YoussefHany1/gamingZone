import { useCallback, useMemo, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { useAuthErrorMessages } from "./useAuthErrorMessages";
import { useAuthValidation } from "./useAuthValidation";
import { normalizeEmail } from "../lib/validation";
import { useGoogleAuth } from "./useGoogleAuth";
import { useDiscordAuth } from "./useDiscordAuth";
import { useAnonymousAuth } from "./useAnonymousAuth";
import type { AuthNavigationProp } from "../types";
import { logger } from "@/src/lib/logger";

export type UseLoginFormParams = {
  navigation: AuthNavigationProp<"Login">;
};

/** Fields that participate in inline validation. */
export type LoginField = "email" | "password";

export type UseLoginFormResult = {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  /**
   * Inline validation errors, shown once a field was blurred or a submit was
   * attempted. `null` means valid (or not yet eligible to show).
   */
  errors: Record<LoginField, string | null>;
  /** Marks a field as touched (called on blur). */
  markTouched: (field: LoginField) => void;
  isLoading: boolean;
  handleLogin: () => Promise<void>;
  handleGooglePress: () => Promise<void>;
  handleDiscordPress: () => Promise<void>;
  handleAnonymousLogin: () => Promise<void>;
  handleNavigateToForgotPassword: () => void;
  handleNavigateToRegister: () => void;
};

/** Form state + sign-in flows for the Login screen. */
export function useLoginForm({
  navigation,
}: UseLoginFormParams): UseLoginFormResult {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const messages = useAuthErrorMessages();
  const validators = useAuthValidation();

  const goToApp = useCallback(() => {
    navigation.replace("MainApp");
  }, [navigation]);

  const markTouched = useCallback((field: LoginField): void => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Paste-heavy flows often leave a trailing space; keep the visible value
  // and the submitted value in sync by trimming as the user types.
  const setEmailValue = useCallback(
    (value: string) => setEmail(normalizeEmail(value)),
    [],
  );
  const setPasswordValue = useCallback(
    (value: string) => setPassword(value),
    [],
  );

  /** Inline errors, revealed after blur or first submit attempt. */
  const errors = useMemo(() => {
    const show = (field: LoginField) => touched[field] || submitted;
    return {
      email: show("email")
        ? validators.validateEmail(normalizeEmail(email))
        : null,
      password: show("password")
        ? password.trim()
          ? null
          : t("auth.errors.passwordRequired")
        : null,
    };
  }, [touched, submitted, email, password, validators, t]);

  const handleLogin = useCallback(async (): Promise<void> => {
    setSubmitted(true);

    // Normalise again at submit time in case the value was set programmatically
    // or autofilled without passing through `onChangeText`.
    const normalizedEmail = normalizeEmail(email);
    setEmail(normalizedEmail);

    // Client-side validation: surfaced inline via `errors`, so only bail out.
    if (validators.validateEmail(normalizedEmail) || !password.trim()) return;

    setIsLoading(true);
    try {
      await auth().signInWithEmailAndPassword(normalizedEmail, password);
      navigation.replace("MainApp");
    } catch (error) {
      logger.error("Login failed", error);
      ToastAndroid.show(
        messages.login((error as { code?: string }).code),
        ToastAndroid.LONG,
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, password, validators, messages, navigation]);

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

  const handleNavigateToForgotPassword = useCallback(() => {
    navigation.navigate("ForgotPassword");
  }, [navigation]);

  const handleNavigateToRegister = useCallback(() => {
    navigation.navigate("Register");
  }, [navigation]);

  return {
    email,
    setEmail: setEmailValue,
    password,
    setPassword: setPasswordValue,
    errors,
    markTouched,
    isLoading,
    handleLogin,
    handleGooglePress,
    handleDiscordPress,
    handleAnonymousLogin,
    handleNavigateToForgotPassword,
    handleNavigateToRegister,
  };
}
