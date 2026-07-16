"use client";

import React, { useEffect } from "react";
import { useLangStore } from "@/store/useLangStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Toaster } from "react-hot-toast";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const { lang, setLang } = useLangStore();
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    // 1. Initialize Auth
    const cleanupAuth = initAuth();
    return () => {
      cleanupAuth();
    };
  }, [initAuth]);

  // 2. Synchronize language from URL parameter
  useEffect(() => {
    if (locale === "ar" || locale === "en") {
      setLang(locale);
    }
  }, [locale, setLang]);

  // Apply Language styles dynamically to the document
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      
      // Toggle font classes on the body
      if (lang === "ar") {
        document.body.classList.remove("font-outfit");
        document.body.classList.add("font-cairo");
      } else {
        document.body.classList.remove("font-cairo");
        document.body.classList.add("font-outfit");
      }
    }
  }, [lang]);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      {children}
    </>
  );
}
