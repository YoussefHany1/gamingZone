import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "@/components/Link";

interface SocialRegisterProps {
  t: (key: string) => string;
  loading: boolean;
  handleGoogleSignUp: () => void;
  handleGuestLogin: () => void;
}

export default function SocialRegister({
  t,
  loading,
  handleGoogleSignUp,
  handleGuestLogin,
}: SocialRegisterProps) {
  return (
    <>
      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {t("common.or")}
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Google */}
      <Button
        id="google-sign-up"
        onClick={handleGoogleSignUp}
        isLoading={loading}
        variant="social-google"
        className="w-full"
      >
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path d="M12 24c3.24 0 5.96-1.08 7.96-2.91l-3.57-2.77c-1.08.72-2.46 1.15-4.39 1.15-3.38 0-6.24-2.28-7.27-5.35H.98v2.85C3.01 20.97 7.16 24 12 24z" />
          <path d="M4.73 14.12A6.47 6.47 0 014.5 12c0-.75.13-1.48.37-2.17V6.98H.98A11.97 11.97 0 000 12c0 1.93.46 3.75 1.28 5.41l3.45-3.29z" />
          <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.16 0 3.01 3.03.98 7.02l3.75 2.85c1.03-3.07 3.89-5.12 7.27-5.12z" />
        </svg>
        {t("auth.register.googleSignUp")}
      </Button>

      {/* Already have an account */}
      <Link
        href="/auth/login"
        className="mt-4 w-full py-3.5 rounded-xl border-2 border-secondary-blue font-bold text-white flex items-center justify-center hover:bg-secondary-blue/10 active:scale-[0.98] transition-all duration-300"
      >
        {t("auth.register.haveAnAccount")}
      </Link>

      {/* Guest */}
      <Button
        onClick={handleGuestLogin}
        isLoading={loading}
        variant="ghost"
        className="w-full mt-4"
      >
        {t("auth.guest")}
      </Button>
    </>
  );
}
