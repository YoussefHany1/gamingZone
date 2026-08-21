import { useState, useCallback } from "react";
import { useLangStore } from "@/store/useLangStore";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";
import { FeedbackType } from "../types";

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "";
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "";
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "";

export const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGES_PER_HOUR = 5;
const RATE_LIMIT_KEY = "contact_rate_limit_timestamps";
const ONE_HOUR_MS = 3_600_000;

export function useContactForm() {
  const { t, lang } = useLangStore();
  const user = useAuthStore((state) => state.user);

  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(user?.email ?? "");

  const isValidEmail = useCallback(
    (addr: string): boolean => EMAIL_REGEX.test(addr),
    [],
  );

  const getRateLimitTimestamps = useCallback((): number[] => {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      if (!raw) return [];
      const all: number[] = JSON.parse(raw);
      const now = Date.now();
      return all.filter((ts) => now - ts < ONE_HOUR_MS);
    } catch {
      return [];
    }
  }, []);

  const saveRateLimitTimestamp = useCallback((timestamps: number[]): void => {
    try {
      localStorage.setItem(
        RATE_LIMIT_KEY,
        JSON.stringify([...timestamps, Date.now()]),
      );
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error(
        t("settings.contact.messageError") || "Please enter a message",
      );
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      toast.error(
        t("settings.contact.messageTooLong") || "Message is too long",
      );
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      toast.error(t("settings.contact.invalidEmail") || "Invalid email format");
      return;
    }

    const recentTimestamps = getRateLimitTimestamps();
    if (recentTimestamps.length >= MAX_MESSAGES_PER_HOUR) {
      toast.error(
        t("settings.contact.rateLimitError") ||
          "Rate limit exceeded. Try again later.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
              feedback_type: type,
              message,
              from_email: email || "(not provided)",
              user_id: user?.uid ?? "anonymous",
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailJS HTTP Error: ${response.status} ${errorText}`);
      }

      saveRateLimitTimestamp(recentTimestamps);
      toast.success(
        t("settings.contact.success") || "Message sent successfully",
      );
      setMessage("");
    } catch (error) {
      console.error("[ContactForm] Error sending email:", error);
      toast.error(t("settings.contact.error") || "Error sending message");
    } finally {
      setLoading(false);
    }
  };

  return {
    t,
    lang,
    type,
    setType,
    message,
    setMessage,
    loading,
    email,
    setEmail,
    handleSubmit,
  };
}
