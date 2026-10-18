import { useCallback, useEffect, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";

export type UseEmailVerificationResult = {
  emailVerified: boolean;
  /** True while the "I've verified" re-check is in flight. */
  isChecking: boolean;
  sendVerificationEmail: () => Promise<void>;
  refreshVerification: () => Promise<void>;
};

/**
 * Owns the email-verification state of the given auth user.
 *
 * `user.reload()` mutates the same `User` instance, so the verified flag is
 * mirrored into local state to guarantee a re-render once the account is
 * verified.
 */
export function useEmailVerification(
  user: FirebaseAuthTypes.User | null,
): UseEmailVerificationResult {
  const { t } = useTranslation();

  const [emailVerified, setEmailVerified] = useState<boolean>(
    user?.emailVerified ?? false,
  );
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Keep the verification status in sync with the auth user.
  useEffect(() => {
    setEmailVerified(user?.emailVerified ?? false);
  }, [user]);

  const sendVerificationEmail = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      await user.sendEmailVerification();
      ToastAndroid.show(t("auth.verificationEmailSent"), ToastAndroid.LONG);
    } catch (e) {
      logger.error("Failed to send verification email:", e);
      const code = (e as { code?: string }).code;
      ToastAndroid.show(
        code === "auth/too-many-requests"
          ? t("auth.verifyPrompt.tooManyRequests")
          : t("settings.profile.messages.saveError"),
        ToastAndroid.LONG,
      );
    }
  }, [user, t]);

  // Re-check verification after the user clicks the link in their inbox.
  const refreshVerification = useCallback(async (): Promise<void> => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      await auth().currentUser?.reload();
      const verified = auth().currentUser?.emailVerified ?? false;
      setEmailVerified(verified);
      ToastAndroid.show(
        verified
          ? t("auth.verifyPrompt.verifiedSuccess")
          : t("auth.verifyPrompt.notVerifiedYet"),
        ToastAndroid.LONG,
      );
    } catch (error) {
      logger.error("Failed to refresh verification status:", error);
      ToastAndroid.show(t("auth.verifyPrompt.notVerifiedYet"), ToastAndroid.LONG);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, t]);

  return { emailVerified, isChecking, sendVerificationEmail, refreshVerification };
}
