import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export type AuthErrorMessages = {
  /** Maps a Firebase login error code to a localised message. */
  login: (code?: string) => string;
  /** Maps a Firebase sign-up error code to a localised message. */
  signup: (code?: string) => string;
};

/** Centralised Firebase auth error-code → localised-message mapping. */
export function useAuthErrorMessages(): AuthErrorMessages {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      login: (code?: string): string => {
        if (
          code === "auth/invalid-credential" ||
          code === "auth/user-not-found" ||
          code === "auth/wrong-password"
        ) {
          return t("auth.errors.invalidCredentials");
        }
        if (code === "auth/network-request-failed") return t("auth.errors.network");
        if (code === "auth/too-many-requests") {
          return "Too many failed attempts. Please wait a moment and try again.";
        }
        return t("common.error");
      },
      signup: (code?: string): string => {
        if (code === "auth/email-already-in-use") {
          return t("auth.errors.emailAlreadyInUse");
        }
        if (code === "auth/weak-password") return t("auth.errors.weakPassword");
        if (code === "auth/invalid-email") return t("auth.errors.invalidEmail");
        return t("auth.errors.general");
      },
    }),
    [t],
  );
}
