import type { SectionItem } from "../types";

/**
 * Builds the ordered list of home sections. `refreshToken` is folded into each
 * key so a pull-to-refresh remounts the sections (re-running their staggered
 * fetches), except the release calendar, which is keyed by a constant and
 * re-fetches through its `refreshToken` prop instead.
 */
export function buildHomeSections(
  currentLang: string,
  refreshToken: number,
): SectionItem[] {
  const website = currentLang === "ar" ? "true gaming" : "destructoid";

  return [
    { type: "slideshow", website, category: "news", _key: `slideshow_${refreshToken}` },
    // ── Immediate — pure UI, no fetch of its own ────────────────────────────
    { type: "quick_actions", _key: "quick_actions" },
    // ── Above the fold ──────────────────────────────────────────────────────
    { type: "free_games", _key: `free_games_${refreshToken}` },
    // NOTE: no `website` on the tab groups — the news feeds are all-sources
    // (as the stacked sections always were). Only the Slideshow is site-bound.
    { type: "weekly_summary", _key: `weekly_${refreshToken}` },
    // ── Staggered — spread the network burst so fetches never stack up ─────
    { type: "recommended", _key: `recommended_${refreshToken}` },
    { type: "ad", _key: "ad_0" },
    // NOTE: no `website` on the tab groups — the news feeds are all-sources
    // (as the stacked sections always were). Only the Slideshow is site-bound.
    {
      type: "news_tabs",
      id: "news_tabs", // News | Reviews
      _key: `news_tabs_${currentLang}_${refreshToken}`,
    },
    { type: "events", _key: `events_${refreshToken}` },
    {
      type: "release_calendar",
      refreshToken,
      _key: "release_calendar",
    },
    { type: "ad", _key: "ad_1" },
    {
      type: "news_tabs",
      id: "insight_tabs", // Esports | Hardware
      _key: `insight_tabs_${currentLang}_${refreshToken}`,
    },
  ];
}
