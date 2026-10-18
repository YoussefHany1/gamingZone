import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildCountryOptions } from "@/src/lib/countries";
import type { PickerOption } from "@/src/types/sharedTypes";

/**
 * The localised country list for a picker, rebuilt only when the app language
 * changes. The list itself — locale mapping, exclusions, ordering — lives in
 * `lib/countries.ts` so the profile and register pickers cannot diverge.
 */
export function useCountryList(): PickerOption[] {
  const { i18n } = useTranslation();

  return useMemo(() => buildCountryOptions(i18n.language), [i18n.language]);
}
