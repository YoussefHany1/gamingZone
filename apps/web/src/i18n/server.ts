import { createTranslator, type TranslateFn } from "./translate";
import "server-only";

/** Server-side translator for the given locale (falls back to English). */
export function getTranslations(locale: string): TranslateFn {
  return createTranslator(locale);
}
