"use client";

import Link from "next/link";


import { Ghost, Home } from "lucide-react";
import { useLangStore } from "@/store/useLangStore";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFoundPage() {
  const { lang, t } = useLangStore();

  return (
    <div className="min-h-screen flex flex-col text-white font-outfit" dir={lang === "ar" ? "rtl" : "ltr"}>
      <Header />
      <main className="grow flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-panel p-10 rounded-3xl max-w-lg w-full flex flex-col items-center gap-6 border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-light-blue/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary-blue/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative">
            <Ghost className="w-24 h-24 text-light-blue animate-bounce" strokeWidth={1.5} />
            <div className="absolute -bottom-2 w-16 h-2 bg-black/40 blur-sm rounded-full left-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="space-y-2 relative z-10">
            <h1 className="text-6xl font-black bg-linear-to-r from-light-blue to-secondary-blue text-transparent bg-clip-text">
              404
            </h1>
            <h2 className="text-xl font-bold text-white mt-2">
              {lang === "ar" ? "يبدو أنك ضللت الطريق!" : "Looks like you're lost!"}
            </h2>
            <p className="text-gray-400 text-sm">
              {lang === "ar" 
                ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها لمكان آخر."
                : "The page you're looking for doesn't exist or has been moved."}
            </p>
          </div>

          <Link
            href="/"
            className="px-8 py-3 mt-4 rounded-xl flex items-center gap-2 bg-white/10 border border-white/20 font-bold hover:bg-white/20 transition-colors active:scale-[0.98] relative z-10"
          >
            <Home className="w-5 h-5" />
            {t("navigation.titles.home") || "Back to Home"}
          </Link>
        </div>
      </main>
      <Footer locale={lang} />
    </div>
  );
}
