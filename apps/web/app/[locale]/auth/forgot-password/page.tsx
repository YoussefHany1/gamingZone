"use client";

import { ForgotPasswordForm, useForgotPassword, AuthLayout } from "@/features/auth";
import { Card } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const { t, error, success, loading, handleEmailResetPassword } =
    useForgotPassword();

  return (
    <AuthLayout>
      <Card className="p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2">
          {t("auth.forgotPassword.title")}
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          {t("auth.forgotPassword.successMessage")}
        </p>

        <ForgotPasswordForm
          t={t}
          error={error}
          success={success}
          loading={loading}
          handleResetPassword={handleEmailResetPassword}
        />
      </Card>
    </AuthLayout>
  );
}
