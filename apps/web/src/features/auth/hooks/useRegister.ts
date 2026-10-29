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
import { ensurePublicProfile } from "@/features/profile/lib/publicProfile";
import { createSessionFromUser } from "../services/session";

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

        // Claim the handle + create `profiles/{uid}` in one server-side
        // transaction. Best-effort: a Functions outage must not lose the
        // account (useProfileBootstrap retries on the next session).
        try {
          await ensurePublicProfile(user.uid, name);
        } catch (profileError) {
          console.warn("Handle bootstrap failed during registration:", profileError);
        }

        await createSessionFromUser(user);

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

      // Google sign-up does not create a `users` document; the handle claim is
      // the only thing this path owes the social layer. Best-effort so a
      // Functions outage never blocks sign-in.
      try {
        await ensurePublicProfile(
          userCredential.user.uid,
          userCredential.user.displayName ?? "",
        );
      } catch (profileError) {
        console.warn("Handle bootstrap failed during Google sign-up:", profileError);
      }

      await createSessionFromUser(userCredential.user);
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
      await createSessionFromUser(userCredential.user);
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
