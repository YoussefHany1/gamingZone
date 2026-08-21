"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useLangStore } from "@/store/useLangStore";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang, t } = useLangStore();

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col text-white font-outfit"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <Header />
      <main className="grow flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-panel p-10 rounded-3xl max-w-lg w-full flex flex-col items-center gap-6 border border-white/10 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              {t("common.error") || "Something went wrong!"}
            </h1>
            <p className="text-gray-400 text-sm">{t("auth.errors.general")}</p>
          </div>

          <button
            onClick={() => reset()}
            className="px-8 py-3 rounded-xl bg-linear-to-r from-secondary-blue to-light-blue font-bold shadow-lg hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            {t("common.retryButton")}
          </button>
        </div>
      </main>
      <Footer locale={lang} />
    </div>
  );
}
