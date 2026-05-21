"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useLangStore } from "../../../store/useLangStore";
import { Gamepad2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useLangStore();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccess(false);

      if (!email) {
        setError(t("auth.forgotPassword.emptyEmail"));
        return;
      }

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
    [email, t]
  );

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
          <h2 className="text-2xl font-bold text-center mb-2">
            {t("auth.forgotPassword.title")}
          </h2>
          <p className="text-sm text-gray-400 text-center mb-6">
            {t("auth.forgotPassword.successMessage")}
          </p>

          {/* Success */}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-sm text-center flex flex-col items-center gap-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <p className="font-semibold">{t("auth.forgotPassword.successTitle")}</p>
              <p className="text-green-300/80">{t("auth.forgotPassword.successMessage")}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-blue/60" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300"
                />
              </div>

              {/* Send Button */}
              <button
                id="forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-bold text-white shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? t("auth.forgotPassword.sending")
                  : t("auth.forgotPassword.sendButton")}
              </button>
            </form>
          )}

          {/* Back to Login */}
          <Link
            href="/auth/login"
            className="mt-6 w-full py-3.5 rounded-xl border-2 border-secondary-blue font-bold text-white flex items-center justify-center gap-2 hover:bg-secondary-blue/10 active:scale-[0.98] transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
