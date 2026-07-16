import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useLangStore } from "@/store/useLangStore";

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import arLocale from "i18n-iso-countries/langs/ar.json";

countries.registerLocale(enLocale);
countries.registerLocale(arLocale);

export function useRegister() {
  const router = useRouter();
  const { t, lang } = useLangStore();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const countriesList = useMemo(() => {
    const names = countries.getNames(lang === "ar" ? "ar" : "en", { select: "official" });
    return Object.entries(names)
      .filter(([code]) => code !== "IL")
      .map(([code, label]) => ({ code, label: label as string }))
      .sort((a, b) => a.label.localeCompare(b.label, lang === "ar" ? "ar" : "en"));
  }, [lang]);

  const handleEmailSignup = useCallback(
    async ({ name, email, password, gender, country }: { name: string, email: string, password: string, gender: string, country: string }) => {
      setError("");
      setLoading(true);
      try {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        await updateProfile(user, { displayName: name });

        // Store additional user profile data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: name,
          email,
          country,
          gender,
          photoURL: null,
          createdAt: serverTimestamp(),
          platform: "",
          dob: "",
        });

        const idToken = await user.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        router.push("/");
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "auth/email-already-in-use") {
          setError(t("auth.errors.emailAlreadyInUse"));
        } else if (code === "auth/weak-password") {
          setError(t("auth.errors.weakPassword"));
        } else if (code === "auth/invalid-email") {
          setError(t("auth.errors.invalidEmail"));
        } else {
          setError(t("auth.errors.general"));
        }
      } finally {
        setLoading(false);
      }
    },
    [t, router],
  );

  const handleGoogleSignUp = useCallback(async () => {
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
    countriesList,
    handleEmailSignup,
    handleGoogleSignUp,
    handleGuestLogin,
  };
}
