import { useCallback, useMemo, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { useAuthValidation } from "./useAuthValidation";
import { normalizeEmail } from "../lib/validation";
import type { AuthNavigationProp } from "../types";
import { logger } from "@/src/lib/logger";

export type UseForgotPasswordFormParams = {
  navigation: AuthNavigationProp<"ForgotPassword">;
};

export type UseForgotPasswordFormResult = {
  email: string;
  setEmail: (email: string) => void;
  /**
   * Inline validation error, shown once the field was blurred or a submit was
   * attempted. `null` means valid (or not yet eligible to show).
   */
  error: string | null;
  /** Marks the email field as touched (called on blur). */
  markTouched: () => void;
  loading: boolean;
  handleResetPassword: () => Promise<void>;
  handleGoBack: () => void;
};

/** Form state + reset-password flow for the ForgotPassword screen. */
export function useForgotPasswordForm({
  navigation,
}: UseForgotPasswordFormParams): UseForgotPasswordFormResult {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const validators = useAuthValidation();

  const markTouched = useCallback((): void => setTouched(true), []);

  /** Inline error, revealed after blur or first submit attempt. */
  const error = useMemo(
    () =>
      touched || submitted
        ? validators.validateEmail(normalizeEmail(email))
        : null,
    [touched, submitted, email, validators],
  );

  const handleResetPassword = useCallback(async (): Promise<void> => {
    setSubmitted(true);

    // Normalise again at submit time in case the value was autofilled.
    const normalizedEmail = normalizeEmail(email);
    setEmail(normalizedEmail);

    // Client-side validation: surfaced inline via `error`, so only bail out.
    if (validators.validateEmail(normalizedEmail)) return;

    setLoading(true);
    try {
      // Note: we intentionally do NOT pre-check with fetchSignInMethodsForEmail here,
      // since Firebase's Email Enumeration Protection makes it return an empty array
      // for every address (existing or not), which would falsely report "no account".
      // sendPasswordResetEmail itself resolves successfully even for unknown emails
      // (to prevent account enumeration), so existing accounts always receive the link.
      await auth().sendPasswordResetEmail(normalizedEmail);
      ToastAndroid.show(t("auth.forgotPassword.successTitle"), ToastAndroid.LONG);
      navigation.goBack();
    } catch (error: unknown) {
      logger.error("[ForgotPasswordScreen] Reset error:", error);
      const code = (error as { code?: string }).code;
      const key =
        code === "auth/user-not-found"
          ? "auth.forgotPassword.errors.userNotFound"
          : "auth.forgotPassword.errors.general";
      ToastAndroid.show(t(key), ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  }, [email, navigation, t, validators]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const setEmailValue = useCallback(
    (value: string) => setEmail(normalizeEmail(value)),
    [],
  );

  return {
    email,
    setEmail: setEmailValue,
    error,
    markTouched,
    loading,
    handleResetPassword,
    handleGoBack,
  };
}
