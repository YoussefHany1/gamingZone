"use client";

import React, { useEffect } from "react";
import { useLangStore } from "../store/useLangStore";
import { useAuthStore } from "../store/useAuthStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useLangStore();
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    // 1. Initialize Auth
    const cleanupAuth = initAuth();

    // 2. Initialize Language from LocalStorage if exists
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("gaming_zone_lang") as "en" | "ar" | null;
      if (savedLang === "ar" || savedLang === "en") {
        setLang(savedLang);
      } else {
        const browserLang = navigator.language.startsWith("ar") ? "ar" : "en";
        setLang(browserLang);
      }
    }

    return () => {
      cleanupAuth();
    };
  }, [initAuth, setLang]);

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

  return <>{children}</>;
}
