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

export const useLangStore = create<LangState>((set, get) => ({
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
    const { lang } = get();
    return getTranslator(lang)(key, replacements);
  },
}));

export type { TranslateFn };
