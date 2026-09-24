import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import en from "@gaming-zone/locales/en.json";
import ar from "@gaming-zone/locales/ar.json";
import es from "@gaming-zone/locales/es.json";
import fr from "@gaming-zone/locales/fr.json";
import hi from "@gaming-zone/locales/hi.json";
import ptBr from "@gaming-zone/locales/pt-BR.json";
import ptPT from "@gaming-zone/locales/pt-PT.json";
import { storage } from "./lib/storage";

// supported languages in app
type SupportedLanguage = "en" | "ar" | "es" | "fr" | "hi" | "pt-BR" | "pt-PT";

// Resources Type
interface Resources {
  [lang: string]: {
    translation: typeof en;
  };
}

// Resources
const resources: Resources = {
  en: { translation: en },
  ar: { translation: ar },
  es: { translation: es },
  fr: { translation: fr },
  hi: { translation: hi },
  "pt-BR": { translation: ptBr },
  "pt-PT": { translation: ptPT },
};

// Language Detection
// Restore the user-selected language first; fall back to the device RTL flag
// (Arabic) so existing ar/en installations keep their current behavior.
const storedLanguage = storage.getString("@language") as SupportedLanguage | undefined;
const detectedLanguage: SupportedLanguage =
  storedLanguage ?? (I18nManager.isRTL ? "ar" : "en");

// i18n Init
i18n.use(initReactI18next).init({
  resources,
  lng: detectedLanguage,
  fallbackLng: "en" as SupportedLanguage,
  compatibilityJSON: "v4",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

export { detectedLanguage };
