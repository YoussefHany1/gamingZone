import type { ReactElement } from "react";
import type { ArticlePlatform } from "@gaming-zone/core";

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
  /** Hidden inside the tabbed section, whose tab bar replaces the title. */
  showHeaderTitle?: boolean | undefined;
  /** Client-side platform relevance filter, passed through to `LatestNews`. */
  userPlatform?: ArticlePlatform | undefined;
  /** False while the profile platform resolves — keeps the feed idle. */
  feedReady?: boolean | undefined;
};

/** The four tabbable news feeds. */
export type NewsTabKey = "news" | "reviews" | "esports" | "hardware";

/** The tabbed news section (one instance per tab group). */
export type TabbedNewsSectionProps = {
  language: string;
  website?: string | undefined;
  /** Which tabs this instance shows, in order; the first is the default. */
  tabs: readonly NewsTabKey[];
  /** Tab to activate, requested externally (quick-action chips). */
  tabRequest?: string | undefined;
};

/** `ReleaseCalendar` wrapper that re-fetches on `refreshToken` instead of remounting. */
export type ReleaseCalendarSectionProps = {
  refreshToken: number | undefined;
};

/** Quick-action chips: scrolls the home feed to the matching section. */
export type QuickActionsProps = {
  onScrollToSection: (id: string) => void;
};

/** The full list of home sections for a given refresh token. */
export type HomeSectionsProps = {
  refreshToken: number;
  /** Reports each section's content-space y offset by logical id. */
  onSectionLayout?: ((id: string, y: number) => void) | undefined;
  /** Scrolls the home feed to the section with the given logical id. */
  onScrollToSection?: ((id: string) => void) | undefined;
  /** Tab to activate in the tabbed news section (quick-action chips). */
  newsTabRequest?: string | undefined;
};

/** The pulsing floating button that opens the AI chat. */
export type AIChatFabProps = {
  onPress: () => void;
};
