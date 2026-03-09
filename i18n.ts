import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

// supported languages in app
type SupportedLanguage = "en" | "ar";

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
};

// Language Detection

const locales = Localization.getLocales();
const _systemLanguage: string | undefined = locales[0]?.languageCode ?? undefined;
const detectedLanguage: SupportedLanguage = I18nManager.isRTL ? "ar" : "en";

// i18n Init
i18n
  .use(initReactI18next)
  .init({
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