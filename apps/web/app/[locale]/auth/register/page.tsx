"use client";

import { RegisterForm, SocialRegister, useRegister, AuthLayout } from "@/features/auth";
import { Card } from "@/components/ui/Card";

export default function RegisterPage() {
  const {
    t,
    error,
    loading,
    countriesList,
    handleEmailSignup,
    handleGoogleSignUp,
    handleGuestLogin,
  } = useRegister();

  return (
    <AuthLayout>
      <Card className="p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-6">
          {t("auth.register.title")}
        </h2>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center animate-in fade-in duration-300">
            {error}
          </div>
        )}

        <RegisterForm
          t={t}
          loading={loading}
          countriesList={countriesList}
          handleSignup={handleEmailSignup}
        />

        <SocialRegister
          t={t}
          loading={loading}
          handleGoogleSignUp={handleGoogleSignUp}
          handleGuestLogin={handleGuestLogin}
        />
      </Card>
    </AuthLayout>
  );
}
