import { useCallback, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";

export type UseVerifyEmailParams = {
  /** Called after the account is confirmed verified. */
  onVerified: () => void;
  /** Called when the user chooses to continue without verifying. */
  onSkip: () => void;
};

export type UseVerifyEmailResult = {
  visible: boolean;
  email: string;
  isChecking: boolean;
  isResending: boolean;
  /** Opens the modal for the given address (called after sign-up). */
  open: (email: string) => void;
  handleCheckVerified: () => Promise<void>;
  handleResend: () => Promise<void>;
  handleSkip: () => void;
};

/** Post-signup email-verification prompt flow (resend / check / skip). */
export function useVerifyEmail({
  onVerified,
  onSkip,
}: UseVerifyEmailParams): UseVerifyEmailResult {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const open = useCallback((targetEmail: string) => {
    setEmail(targetEmail);
    setVisible(true);
  }, []);

  const handleResend = useCallback(async (): Promise<void> => {
    if (isResending) return;
    setIsResending(true);
    try {
      await auth().currentUser?.sendEmailVerification();
      ToastAndroid.show(t("auth.verificationEmailSent"), ToastAndroid.LONG);
    } catch (error) {
      logger.error("Failed to resend verification email:", error);
      const code = (error as { code?: string }).code;
      ToastAndroid.show(
        code === "auth/too-many-requests"
          ? t("auth.verifyPrompt.tooManyRequests")
          : t("auth.verifyPrompt.resendError"),
        ToastAndroid.LONG,
      );
    } finally {
      setIsResending(false);
    }
  }, [isResending, t]);

  const handleCheckVerified = useCallback(async (): Promise<void> => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      await auth().currentUser?.reload();
      if (auth().currentUser?.emailVerified) {
        ToastAndroid.show(t("auth.verifyPrompt.verifiedSuccess"), ToastAndroid.LONG);
        setVisible(false);
        onVerified();
      } else {
        ToastAndroid.show(t("auth.verifyPrompt.notVerifiedYet"), ToastAndroid.LONG);
      }
    } catch (error) {
      logger.error("Failed to refresh verification status:", error);
      ToastAndroid.show(t("auth.verifyPrompt.notVerifiedYet"), ToastAndroid.LONG);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, onVerified, t]);

  const handleSkip = useCallback((): void => {
    setVisible(false);
    onSkip();
  }, [onSkip]);

  return {
    visible,
    email,
    isChecking,
    isResending,
    open,
    handleCheckVerified,
    handleResend,
    handleSkip,
  };
}
