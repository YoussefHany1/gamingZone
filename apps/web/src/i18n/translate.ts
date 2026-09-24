import ar from "@gaming-zone/locales/ar.json";
import en from "@gaming-zone/locales/en.json";

export type Locale = "en" | "ar";

export type TranslateFn = (
  key: string,
  replacements?: Record<string, string | number>,
) => string;

type Dictionary = Record<string, unknown>;

const dictionaries: Record<Locale, Dictionary> = {
  ar: ar as Dictionary,
  en: en as Dictionary,
};

function lookup(dictionary: Dictionary, key: string): unknown {
  let value: unknown = dictionary;
  for (const part of key.split(".")) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Dictionary)[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function interpolate(template: string, replacements: Record<string, string | number>): string {
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}

/**
 * Resolves a translation key against the given locale's dictionary,
 * falling back to English and finally to the key itself.
 */
export function createTranslator(locale: string): TranslateFn {
  const dictionary = dictionaries[locale as Locale] ?? dictionaries.en;

  return (key, replacements) => {
    let value = lookup(dictionary, key);
    if (value === undefined) {
      value = lookup(dictionaries.en, key);
    }

    if (typeof value !== "string") {
      return key;
    }

    return replacements ? interpolate(value, replacements) : value;
  };
}
