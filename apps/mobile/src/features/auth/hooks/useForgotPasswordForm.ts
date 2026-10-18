import { useCallback, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import type { AuthNavigationProp } from "../types";
import { logger } from "@/src/lib/logger";

export type UseForgotPasswordFormParams = {
  navigation: AuthNavigationProp<"ForgotPassword">;
};

export type UseForgotPasswordFormResult = {
  email: string;
  setEmail: (email: string) => void;
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

  const handleResetPassword = useCallback(async (): Promise<void> => {
    if (!email) {
      ToastAndroid.show(t("auth.forgotPassword.emptyEmail"), ToastAndroid.LONG);
      return;
    }

    setLoading(true);
    try {
      // Note: we intentionally do NOT pre-check with fetchSignInMethodsForEmail here,
      // since Firebase's Email Enumeration Protection makes it return an empty array
      // for every address (existing or not), which would falsely report "no account".
      // sendPasswordResetEmail itself resolves successfully even for unknown emails
      // (to prevent account enumeration), so existing accounts always receive the link.
      await auth().sendPasswordResetEmail(email);
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
  }, [email, navigation, t]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const setEmailValue = useCallback((value: string) => setEmail(value), []);

  return {
    email,
    setEmail: setEmailValue,
    loading,
    handleResetPassword,
    handleGoBack,
  };
}
