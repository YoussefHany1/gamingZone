import { useState, useCallback } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLangStore } from "@/store/useLangStore";

export function useForgotPassword() {
  const { t } = useLangStore();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailResetPassword = useCallback(
    async ({ email }: { email: string }) => {
      setError("");
      setSuccess(false);

      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        setSuccess(true);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "auth/user-not-found" || code === "auth/invalid-email") {
          setError(t("auth.forgotPassword.errors.userNotFound"));
        } else {
          setError(t("auth.forgotPassword.errors.general"));
        }
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  return {
    t,
    error,
    success,
    loading,
    handleEmailResetPassword,
  };
}
