import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { OnboardingSlide } from "../types";

export type UseOnboardingSlidesResult = {
  slides: OnboardingSlide[];
  /** Number of slides, which the pager and the dots both need. */
  total: number;
};

/**
 * `t(..., { returnObjects: true })` returns the key string itself when the
 * namespace or array is missing from the active locale (e.g. a partially
 * translated language file). Casting without checking would turn `total` into
 * the string's character count and crash any `.map` over `slides` — degrade to
 * an empty list instead so onboarding can still render its fallback visuals.
 */
export function useOnboardingSlides(): UseOnboardingSlidesResult {
  const { t } = useTranslation();

  const slides = useMemo(() => {
    const raw = t("onboarding.slides", { returnObjects: true });
    return Array.isArray(raw) ? (raw as OnboardingSlide[]) : [];
  }, [t]);

  return { slides, total: slides.length };
}
