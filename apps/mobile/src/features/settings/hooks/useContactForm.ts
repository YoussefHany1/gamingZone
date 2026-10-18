import { useCallback, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import {
  getRecentSubmissions,
  isValidEmail,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_HOUR,
  recordSubmission,
  sendFeedback,
} from "../lib/contact";
import type { FeedbackType } from "../types";
import { logger } from "@/src/lib/logger";

export type UseContactFormResult = {
  type: FeedbackType;
  setType: (type: FeedbackType) => void;
  message: string;
  setMessage: (message: string) => void;
  email: string;
  setEmail: (email: string) => void;
  isSending: boolean;
  submit: () => Promise<void>;
};

/**
 * Owns the contact form: field state, validation, the hourly rate limit, and
 * the EmailJS submission. `goBack` runs on a successful send.
 */
export function useContactForm(goBack: () => void): UseContactFormResult {
  const { t } = useTranslation();
  const currentUser = auth().currentUser;

  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState<string>(currentUser?.email ?? "");
  const [isSending, setIsSending] = useState<boolean>(false);

  const submit = useCallback(async (): Promise<void> => {
    if (!message.trim()) {
      ToastAndroid.show(t("settings.contact.messageError"), ToastAndroid.LONG);
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      ToastAndroid.show(t("settings.contact.messageTooLong"), ToastAndroid.LONG);
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      ToastAndroid.show(t("settings.contact.invalidEmail"), ToastAndroid.LONG);
      return;
    }

    // Rate limit check — synchronous, so nothing can slip through between the
    // check and the send.
    const recentSubmissions = getRecentSubmissions();
    if (recentSubmissions.length >= MAX_MESSAGES_PER_HOUR) {
      ToastAndroid.show(t("settings.contact.rateLimitError"), ToastAndroid.LONG);
      return;
    }

    setIsSending(true);
    try {
      await sendFeedback({
        type,
        message,
        email,
        uid: currentUser?.uid ?? null,
      });

      recordSubmission(recentSubmissions);
      ToastAndroid.show(t("settings.contact.success"), ToastAndroid.LONG);
      goBack();
    } catch (error) {
      logger.error("[ContactScreen] Error sending email:", error);
      ToastAndroid.show(t("settings.contact.error"), ToastAndroid.LONG);
    } finally {
      setIsSending(false);
    }
  }, [message, email, type, currentUser, t, goBack]);

  return { type, setType, message, setMessage, email, setEmail, isSending, submit };
}
