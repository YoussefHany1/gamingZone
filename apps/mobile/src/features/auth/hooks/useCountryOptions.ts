import { useCallback, useEffect, useState } from "react";
import { getLocales } from "expo-localization";
import { useCountryList } from "@/src/hooks/useCountryList";
import type { AuthPickerOption } from "../types";
import { logger } from "@/src/lib/logger";

export type UseCountryOptionsResult = {
  country: string;
  setCountry: (code: string) => void;
  countriesList: AuthPickerOption[];
};

/**
 * Owns the country field for the Register screen: seeds the selection from the
 * user's IP (falling back to the device locale) and exposes the localised
 * country list.
 */
export function useCountryOptions(): UseCountryOptionsResult {
  const [country, setCountry] = useState("");
  const countriesList = useCountryList();

  useEffect(() => {
    let cancelled = false;

    const fetchCountryByIP = async () => {
      try {
        const response = await fetch("https://get.geojs.io/v1/ip/country.json");
        if (response.ok) {
          const data = await response.json();
          if (data && data.country) {
            if (!cancelled) setCountry(data.country);
            return;
          }
        }
      } catch (error) {
        logger.warn("Failed to get country by IP", error);
      }
      // Fallback to device locale
      if (!cancelled) setCountry(getLocales()[0]?.regionCode ?? "");
    };

    fetchCountryByIP();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCountryCode = useCallback((code: string) => setCountry(code), []);

  return { country, setCountry: setCountryCode, countriesList };
}
