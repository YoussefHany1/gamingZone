import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "@/components/Link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  t: (key: string) => string;
  loading: boolean;
  handleLogin: (data: LoginFormValues) => void;
}

export default function LoginForm({ t, loading, handleLogin }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  return (
    <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
      {/* Email */}
      <div>
        <Input
          id="login-email"
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

      {/* Password */}
      <div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.passwordPlaceholder")}
            autoComplete="current-password"
            className="pr-12"
            icon={<Lock className="w-5 h-5 text-light-blue/60" />}
            {...register("password")}
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
        {errors.password && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            {t(`auth.errors.${errors.password.message}`) ||
              errors.password.message}
          </p>
        )}
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
      <Button
        id="login-submit"
        type="submit"
        isLoading={loading}
        className="w-full"
      >
        {loading ? t("common.loading") : t("auth.login.signInButton")}
      </Button>
    </form>
  );
}
