import { useCallback, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";
import { useCountdown } from "./useCountdown";

/** Seconds the user must wait between verification-email resends. */
const RESEND_COOLDOWN_SECONDS = 60;

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
  /** Seconds left on the resend cooldown; `0` allows a resend. */
  resendCooldown: number;
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
  const cooldown = useCountdown();

  const open = useCallback(
    (targetEmail: string) => {
      setEmail(targetEmail);
      setVisible(true);
      // Fresh cooldown on every modal open so spamming is impossible even
      // when the user re-registers in the same session.
      cooldown.start(RESEND_COOLDOWN_SECONDS);
    },
    [cooldown],
  );

  const handleResend = useCallback(async (): Promise<void> => {
    if (isResending || cooldown.isActive) return;
    setIsResending(true);
    try {
      await auth().currentUser?.sendEmailVerification();
      ToastAndroid.show(t("auth.verificationEmailSent"), ToastAndroid.LONG);
      cooldown.start(RESEND_COOLDOWN_SECONDS);
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
  }, [isResending, cooldown, t]);

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
    resendCooldown: cooldown.remaining,
    open,
    handleCheckVerified,
    handleResend,
    handleSkip,
  };
}
