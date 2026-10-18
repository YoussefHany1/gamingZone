import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { OnboardingSlide } from "../types";

export type UseOnboardingSlidesResult = {
  slides: OnboardingSlide[];
  /** Number of slides, which the pager and the dots both need. */
  total: number;
};

/** The localized onboarding copy, re-read whenever the language changes. */
export function useOnboardingSlides(): UseOnboardingSlidesResult {
  const { t } = useTranslation();

  const slides = useMemo(
    () => t("onboarding.slides", { returnObjects: true }) as OnboardingSlide[],
    [t],
  );

  return { slides, total: slides.length };
}
