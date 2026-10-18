/**
 * The localised country list used by the profile and register pickers.
 *
 * `i18n-iso-countries` ships one JSON bundle per locale and reads it from an
 * in-memory registry, so every bundle the app can display is registered once at
 * module load. The mapping from an i18next tag to a bundle (`pt-BR` → `pt`) and
 * the sort order live here rather than in each picker, so the two lists cannot
 * drift apart.
 */
import countries from "i18n-iso-countries";
import arLang from "i18n-iso-countries/langs/ar.json";
import enLang from "i18n-iso-countries/langs/en.json";
import esLang from "i18n-iso-countries/langs/es.json";
import frLang from "i18n-iso-countries/langs/fr.json";
import hiLang from "i18n-iso-countries/langs/hi.json";
import ptLang from "i18n-iso-countries/langs/pt.json";
import type { PickerOption } from "@/src/types/sharedTypes";

countries.registerLocale(enLang);
countries.registerLocale(arLang);
countries.registerLocale(esLang);
countries.registerLocale(frLang);
countries.registerLocale(hiLang);
countries.registerLocale(ptLang);

/** Locales this app ships a country-name bundle for. */
export const COUNTRY_LOCALES = ["en", "ar", "es", "fr", "hi", "pt"] as const;

export type CountryLocale = (typeof COUNTRY_LOCALES)[number];

/** Countries kept out of the pickers. */
export const EXCLUDED_COUNTRY_CODES: ReadonlySet<string> = new Set(["IL"]);

/**
 * Narrows an i18next language tag to a registered country locale. Region tags
 * collapse to the bundle that exists (`pt-BR` → `pt`); anything unsupported
 * falls back to English.
 */
export function resolveCountryLocale(language: string): CountryLocale {
  if (language.startsWith("ar")) return "ar";
  if (language.startsWith("es")) return "es";
  if (language.startsWith("fr")) return "fr";
  if (language.startsWith("hi")) return "hi";
  if (language.startsWith("pt")) return "pt";
  return "en";
}

/**
 * The country options for the pickers, sorted by the localised name so the
 * order matches what the user reads.
 */
export function buildCountryOptions(language: string): PickerOption[] {
  const names = countries.getNames(resolveCountryLocale(language), {
    select: "official",
  });

  return Object.entries(names)
    .filter(([code]) => !EXCLUDED_COUNTRY_CODES.has(code))
    .map(([code, name]) => ({ label: name, value: code }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
