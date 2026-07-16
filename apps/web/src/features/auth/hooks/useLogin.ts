import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useLangStore } from "@/store/useLangStore";

export function useLogin() {
  const router = useRouter();
  const { t } = useLangStore();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuthError = useCallback(
    (err: { code?: string }) => {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError(t("auth.errors.invalidCredentials"));
      } else if (err.code === "auth/network-request-failed") {
        setError(t("auth.errors.network"));
      } else if (err.code === "auth/too-many-requests") {
        setError(t("auth.errors.tooManyRequests"));
      } else {
        setError(t("auth.errors.general"));
      }
    },
    [t],
  );

  const handleEmailLogin = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setError("");
      setLoading(true);
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        router.push("/");
      } catch (err) {
        handleAuthError(err as { code?: string });
      } finally {
        setLoading(false);
      }
    },
    [handleAuthError, router],
  );

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      router.push("/");
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user") {
        setError(t("auth.errors.googleSignIn"));
      }
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  const handleGuestLogin = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const idToken = await userCredential.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      router.push("/");
    } catch {
      setError(t("auth.errors.general"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  return {
    t,
    error,
    loading,
    handleEmailLogin,
    handleGoogleSignIn,
    handleGuestLogin,
  };
}
