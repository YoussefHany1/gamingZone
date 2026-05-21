import { create } from "zustand";
import ar from "../../../locales/ar.json";
import en from "../../../locales/en.json";

const translations: Record<string, any> = { ar, en };

interface LangState {
  lang: "en" | "ar";
  setLang: (lang: "en" | "ar") => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: "en",

  setLang: (lang: "en" | "ar") => {
    set({ lang });
    if (typeof window !== "undefined") {
      localStorage.setItem("gaming_zone_lang", lang);
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
  },

  t: (key: string, replacements?: Record<string, string | number>) => {
    const { lang } = get();
    const dictionary = translations[lang] || en;
    const parts = key.split(".");
    
    let value = dictionary;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        // Fallback to English dictionary if not found in current dictionary
        let enValue = en as any;
        for (const enPart of parts) {
          if (enValue && typeof enValue === "object" && enPart in enValue) {
            enValue = enValue[enPart];
          } else {
            enValue = null;
            break;
          }
        }
        value = enValue || key;
        break;
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    // Handle replacements (e.g. {{category}} -> value)
    if (replacements) {
      let replaced = value;
      Object.entries(replacements).forEach(([k, val]) => {
        replaced = replaced.replace(new RegExp(`{{${k}}}`, "g"), String(val));
      });
      return replaced;
    }

    return value;
  },
}));
