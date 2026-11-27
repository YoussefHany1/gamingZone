import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import { createTranslator, type Locale, type TranslateFn } from "@/i18n/translate";

import { LangState } from "./types";

const translators = new Map<Locale, TranslateFn>();

function getTranslator(lang: Locale): TranslateFn {
  let translator = translators.get(lang);
  if (!translator) {
    translator = createTranslator(lang);
    translators.set(lang, translator);
  }
  return translator;
}

const useLangState = create<LangState>((set, get) => ({
  lang: "en",

  setLang: (lang: Locale) => {
    set({ lang });
    if (typeof document !== "undefined") {
      localStorage.setItem("gaming_zone_lang", lang);
      document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
  },

  t: (key: string, replacements?: Record<string, string | number>) => {
    return getTranslator(get().lang)(key, replacements);
  },
}));

export function useLangStore(): LangState;
export function useLangStore<T>(selector: (state: LangState) => T): T;
export function useLangStore<T>(
  selector?: (state: LangState) => T,
): LangState | T {
  const state = useLangState();
  const pathname = usePathname();
  const lang: Locale =
    pathname === "/ar" || pathname?.startsWith("/ar/") ? "ar" : "en";
  const t = useCallback(
    (key: string, replacements?: Record<string, string | number>) =>
      getTranslator(lang)(key, replacements),
    [lang],
  );

  const scopedState: LangState = { ...state, lang, t };
  return selector ? selector(scopedState) : scopedState;
}

export type { TranslateFn };
