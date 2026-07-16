import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "@/components/Link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  t: (key: string) => string;
  error: string;
  success: boolean;
  loading: boolean;
  handleResetPassword: (data: ForgotPasswordFormValues) => void;
}

export default function ForgotPasswordForm({
  t,
  error,
  success,
  loading,
  handleResetPassword,
}: ForgotPasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  return (
    <>
      {/* Success */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-sm text-center flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <p className="font-semibold">
            {t("auth.forgotPassword.successTitle")}
          </p>
          <p className="text-green-300/80">
            {t("auth.forgotPassword.successMessage")}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center animate-in fade-in duration-300">
          {error}
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-4">
          {/* Email */}
          <div>
            <Input
              id="forgot-email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              icon={<Mail className="w-5 h-5 text-light-blue/60" />}
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-400 font-medium">
                {t(`auth.errors.${errors.email.message}`) || errors.email.message}
              </p>
            )}
          </div>

          {/* Send Button */}
          <Button
            id="forgot-submit"
            type="submit"
            isLoading={loading}
            className="w-full"
          >
            {loading
              ? t("auth.forgotPassword.sending")
              : t("auth.forgotPassword.sendButton")}
          </Button>
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
    </>
  );
}
