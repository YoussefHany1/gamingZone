import type { ReactElement } from "react";

/** Generic deferred-mount wrapper: renders `children` only after `delay` ms. */
export type DeferredSectionProps = {
  delay?: number | undefined;
  placeholderHeight?: number | undefined;
  children: ReactElement;
};

/** The home news feed section (fixed to 4 items, no dropdown/footer). */
export type NewsSectionProps = {
  category: string;
  language: string;
  website?: string | undefined;
};

/** `NewsSection` wrapped in a `DeferredSection` with the standard news placeholder. */
export type DeferredNewsSectionProps = {
  category: string;
  language: string;
  website?: string | undefined;
  delay?: number | undefined;
};

/** `ReleaseCalendar` wrapper that re-fetches on `refreshToken` instead of remounting. */
export type ReleaseCalendarSectionProps = {
  refreshToken: number | undefined;
};

/** The full list of home sections for a given refresh token. */
export type HomeSectionsProps = {
  refreshToken: number;
};

/** The pulsing floating button that opens the AI chat. */
export type AIChatFabProps = {
  onPress: () => void;
};
