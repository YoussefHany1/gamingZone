"use client";

import { LoginForm, SocialLogin, useLogin, AuthLayout } from "@/features/auth";
import { Card } from "@/components/ui/Card";
import Link from "@/components/Link";

export default function LoginPage() {
  const {
    t,
    error,
    loading,
    handleEmailLogin,
    handleGoogleSignIn,
    handleGuestLogin,
  } = useLogin();

  return (
    <AuthLayout>
      <Card className="p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-6">
          {t("auth.login.title")}
        </h2>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center animate-in fade-in duration-300">
            {error}
          </div>
        )}

        <LoginForm t={t} loading={loading} handleLogin={handleEmailLogin} />

        <SocialLogin
          t={t}
          loading={loading}
          handleGoogleSignIn={handleGoogleSignIn}
          handleGuestLogin={handleGuestLogin}
        />

        <div className="mt-6 text-center text-sm">
          <Link
            href="/auth/register"
            className="text-light-blue font-bold hover:underline transition-all"
          >
            {t("auth.login.createAccount")}
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
