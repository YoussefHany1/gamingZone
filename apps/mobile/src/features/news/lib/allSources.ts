/**
 * Synthetic source names for the "All sources" entries in the source picker.
 *
 * These are not real RSS sources — they select a combined feed with an optional
 * language filter. `__all__` is kept for backwards compatibility with older
 * cached selections; the language-suffixed variants are what the picker ships
 * today. Use {@link isAllSourcesName} instead of `name.startsWith("__all__")`:
 * the suffixed names start with `"__all_"`, not `"__all__"`.
 */
export const ALL_SOURCES_NAME = "__all__";
export const ALL_LANGUAGES_NAME = "__all_all__";
export const ARABIC_SOURCES_NAME = "__all_ar__";
export const ENGLISH_SOURCES_NAME = "__all_en__";
export const SPANISH_SOURCES_NAME = "__all_es__";
export const FRENCH_SOURCES_NAME = "__all_fr__";
export const HINDI_SOURCES_NAME = "__all_hi__";
export const PORTUGUESE_SOURCES_NAME = "__all_pt__";

// Convenience aliases keyed by language code (some call sites prefer the
// shorter form). All of them resolve to the same synthetic name.
export const AR_SOURCES_NAME = ARABIC_SOURCES_NAME;
export const EN_SOURCES_NAME = ENGLISH_SOURCES_NAME;
export const ES_SOURCES_NAME = SPANISH_SOURCES_NAME;
export const FR_SOURCES_NAME = FRENCH_SOURCES_NAME;
export const HI_SOURCES_NAME = HINDI_SOURCES_NAME;
export const PT_SOURCES_NAME = PORTUGUESE_SOURCES_NAME;

const ALL_SOURCES_NAMES: ReadonlySet<string> = new Set([
  ALL_SOURCES_NAME,
  ALL_LANGUAGES_NAME,
  ARABIC_SOURCES_NAME,
  ENGLISH_SOURCES_NAME,
  SPANISH_SOURCES_NAME,
  FRENCH_SOURCES_NAME,
  HINDI_SOURCES_NAME,
  PORTUGUESE_SOURCES_NAME,
]);

/** True when the source name refers to one of the synthetic all-sources entries. */
export function isAllSourcesName(name?: string | null): boolean {
  return name != null && ALL_SOURCES_NAMES.has(name);
}

/** Synthetic "all sources" name for a given language code, if supported. */
export function allSourcesNameForLanguage(language?: string | null): string | undefined {
  switch (language) {
    case "ar":
      return ARABIC_SOURCES_NAME;
    case "en":
      return ENGLISH_SOURCES_NAME;
    case "es":
      return SPANISH_SOURCES_NAME;
    case "fr":
      return FRENCH_SOURCES_NAME;
    case "hi":
      return HINDI_SOURCES_NAME;
    case "pt":
      return PORTUGUESE_SOURCES_NAME;
    default:
      return undefined;
  }
}

/** Language code for a synthetic "all sources" name, if applicable. */
export function languageForSourceName(name?: string | null): string | undefined {
  switch (name) {
    case ARABIC_SOURCES_NAME:
      return "ar";
    case ENGLISH_SOURCES_NAME:
      return "en";
    case SPANISH_SOURCES_NAME:
      return "es";
    case FRENCH_SOURCES_NAME:
      return "fr";
    case HINDI_SOURCES_NAME:
      return "hi";
    case PORTUGUESE_SOURCES_NAME:
      return "pt";
    case ALL_LANGUAGES_NAME:
    case ALL_SOURCES_NAME:
      return "all";
    default:
      return undefined;
  }
}

/** Ordered list of supported source languages. */
export const SUPPORTED_SOURCE_LANGUAGES = ["ar", "en", "es", "fr", "hi", "pt"] as const;

/**
 * Collapses an arbitrary language tag (`pt-BR`, `pt-PT`, `es-419`, `en-GB`)
 * onto the base source language used by the picker. Unknown tags fall back to
 * `en` so sources are never silently dropped from the list.
 */
export function normalizeSourceLanguage(
  language?: string | null,
): "ar" | "en" | "es" | "fr" | "hi" | "pt" {
  const code = ((language ?? "").split("-")[0] ?? "").toLowerCase();
  if (code === "ar") return "ar";
  if (code === "es") return "es";
  if (code === "fr") return "fr";
  if (code === "hi") return "hi";
  if (code === "pt") return "pt";
  return "en";
}
