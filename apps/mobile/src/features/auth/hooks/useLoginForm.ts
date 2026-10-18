import { useCallback, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { useAuthErrorMessages } from "./useAuthErrorMessages";
import { useGoogleAuth } from "./useGoogleAuth";
import { useAnonymousAuth } from "./useAnonymousAuth";
import type { AuthNavigationProp } from "../types";
import { logger } from "@/src/lib/logger";

export type UseLoginFormParams = {
  navigation: AuthNavigationProp<"Login">;
};

export type UseLoginFormResult = {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoading: boolean;
  handleLogin: () => Promise<void>;
  handleGooglePress: () => Promise<void>;
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
  const messages = useAuthErrorMessages();

  const goToApp = useCallback(() => {
    navigation.replace("MainApp");
  }, [navigation]);

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
      logger.error("Login failed", error);
      ToastAndroid.show(
        messages.login((error as { code?: string }).code),
        ToastAndroid.LONG,
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, password, t, messages, navigation]);

  const handleGooglePress = useGoogleAuth({
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

  const setEmailValue = useCallback((value: string) => setEmail(value), []);
  const setPasswordValue = useCallback((value: string) => setPassword(value), []);

  return {
    email,
    setEmail: setEmailValue,
    password,
    setPassword: setPasswordValue,
    isLoading,
    handleLogin,
    handleGooglePress,
    handleAnonymousLogin,
    handleNavigateToForgotPassword,
    handleNavigateToRegister,
  };
}
