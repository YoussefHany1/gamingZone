"use client";

import React, { useEffect } from "react";
import { useLangStore } from "@/store/useLangStore";
import type { Locale } from "@/i18n/translate";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileBootstrap } from "@/features/profile/hooks/useProfileBootstrap";
import AppDownloadPopup from "@/components/AppDownloadPopup";
import { Toaster } from "react-hot-toast";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const { lang, setLang } = useLangStore();
  const activeLocale: Locale = locale === "ar" ? "ar" : "en";
  const initAuth = useAuthStore((state) => state.initAuth);

  // Every signed-in account must own a profile + handle. No-op once bootstrapped.
  useProfileBootstrap();

  useEffect(() => {
    // 1. Initialize Auth
    const cleanupAuth = initAuth();
    return () => {
      cleanupAuth();
    };
  }, [initAuth]);

  // 2. Synchronize language from URL parameter
  useEffect(() => {
    setLang(activeLocale);
  }, [activeLocale, setLang]);

  // Apply Language styles dynamically to the document
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

      // Toggle font classes on the body
      if (lang === "ar") {
        document.body.classList.remove("font-inter");
        document.body.classList.add("font-cairo");
      } else {
        document.body.classList.remove("font-cairo");
        document.body.classList.add("font-inter");
      }
    }
  }, [lang]);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <AppDownloadPopup />
      {children}
    </>
  );
}
