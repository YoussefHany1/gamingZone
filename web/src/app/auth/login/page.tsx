"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../../../lib/firebase";
import { useLangStore } from "../../../store/useLangStore";
import { Gamepad2, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLangStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    [t]
  );

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!email || !password) {
        setError(t("auth.emptyFields"));
        return;
      }

      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/");
      } catch (err) {
        handleAuthError(err as { code?: string });
      } finally {
        setLoading(false);
      }
    },
    [email, password, t, handleAuthError, router]
  );

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
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
      await signInAnonymously(auth);
      router.push("/");
    } catch {
      setError(t("auth.errors.general"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-bg via-dark-bg to-primary-bg" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-light-blue/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary-blue/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-gradient-to-tr from-light-blue to-secondary-blue rounded-2xl shadow-lg shadow-light-blue/20 mb-4">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wide bg-gradient-to-r from-white via-light-blue to-light-blue bg-clip-text text-transparent">
            Gaming Zone
          </h1>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <h2 className="text-2xl font-bold text-center mb-6">
            {t("auth.login.title")}
          </h2>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center animate-in fade-in duration-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-blue/60" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                autoComplete="email"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-blue/60" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                autoComplete="current-password"
                className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-light-blue hover:text-light-blue/80 transition-colors"
              >
                {t("auth.login.forgotPassword")}
              </Link>
            </div>

            {/* Login Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-bold text-white shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("common.loading") : t("auth.login.signInButton")}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {t("common.or")}
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Sign-In */}
          <button
            id="google-sign-in"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10574b] via-[#3174f1] via-[#e92d18] to-[#c38d0c] font-bold text-white flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t("auth.login.googleSignIn")}
          </button>

          {/* Create Account */}
          <Link
            href="/auth/register"
            className="mt-4 w-full py-3.5 rounded-xl border-2 border-secondary-blue font-bold text-white flex items-center justify-center hover:bg-secondary-blue/10 active:scale-[0.98] transition-all duration-300"
          >
            {t("auth.login.createAccount")}
          </Link>

          {/* Guest */}
          <button
            id="guest-login"
            onClick={handleGuestLogin}
            disabled={loading}
            className="mt-4 w-full py-2.5 text-light-blue hover:text-light-blue/80 underline underline-offset-4 font-medium transition-colors disabled:opacity-50"
          >
            {t("auth.guest")}
          </button>
        </div>
      </div>
    </div>
  );
}
