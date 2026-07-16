import { User, Mail, Lock, Eye, EyeOff, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required (min 2 characters)"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/i, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  gender: z.string().min(1, "Gender is required"),
  country: z.string().min(1, "Country is required"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  t: (key: string) => string;
  loading: boolean;
  countriesList: { code: string; label: string }[];
  handleSignup: (data: RegisterFormValues) => void;
}

export default function RegisterForm({
  t,
  loading,
  countriesList,
  handleSignup,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      gender: "",
      country: "",
    },
  });

  const selectedGender = watch("gender");
  const selectedCountry = watch("country");
  const selectStyles =
    "w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300 appearance-none cursor-pointer";

  return (
    <form onSubmit={handleSubmit(handleSignup)} className="space-y-4">
      {/* Name */}
      <div>
        <Input
          id="register-name"
          type="text"
          placeholder={t("auth.register.namePlaceholder")}
          icon={<User className="w-5 h-5 text-light-blue/60" />}
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <Input
          id="register-email"
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          autoComplete="email"
          icon={<Mail className="w-5 h-5 text-light-blue/60" />}
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Gender */}
      <div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            id="register-gender"
            className={selectStyles}
            style={!selectedGender ? { color: "rgb(107 114 128)" } : undefined}
            {...register("gender")}
          >
            <option value="" disabled>
              {t("auth.register.genderPlaceholder")}
            </option>
            <option value="male">{t("auth.register.male")}</option>
            <option value="female">{t("auth.register.female")}</option>
          </select>
        </div>
        {errors.gender && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            {errors.gender.message}
          </p>
        )}
      </div>

      {/* Country */}
      <div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            id="register-country"
            className={selectStyles}
            style={!selectedCountry ? { color: "rgb(107 114 128)" } : undefined}
            {...register("country")}
          >
            <option value="" disabled>
              {t("auth.register.countryPlaceholder")}
            </option>
            {countriesList.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {errors.country && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            {errors.country.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="relative">
          <Input
            id="register-password"
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.passwordPlaceholder")}
            autoComplete="new-password"
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
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Password hint */}
      <p className="text-xs text-gray-500">
        {t("auth.validation.passwordRequirements")}
      </p>

      {/* Sign Up Button */}
      <Button
        id="register-submit"
        type="submit"
        isLoading={loading}
        className="w-full"
      >
        {loading ? t("common.loading") : t("auth.register.signUpButton")}
      </Button>
    </form>
  );
}
