/** Human-readable names, in the order the selector lists them. */
export const LANGUAGE_LABELS = {
  en: "English",
  ar: "العربية",
  es: "Español",
  fr: "Français",
  hi: "हिन्दी",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
} as const;

export type LanguageCode = keyof typeof LANGUAGE_LABELS;

export const LANGUAGE_CODES = Object.keys(LANGUAGE_LABELS) as LanguageCode[];

/**
 * Narrows an i18next language tag (which may carry a region, e.g. `pt-BR`) to
 * the code the selector switches on. Portuguese regions are kept distinct, so
 * they are matched before the bare `pt` prefix.
 */
export function resolveLanguageCode(language: string): LanguageCode {
  if (language.startsWith("ar")) return "ar";
  if (language.startsWith("es")) return "es";
  if (language.startsWith("fr")) return "fr";
  if (language.startsWith("hi")) return "hi";
  if (language.startsWith("pt-PT")) return "pt-PT";
  if (language.startsWith("pt-BR")) return "pt-BR";
  return "en";
}
