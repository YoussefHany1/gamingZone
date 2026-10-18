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
    // ── Immediate (above the fold) ──────────────────────────────────────────
    { type: "news", category: "news", _key: `news_0_${currentLang}_${refreshToken}` },
    { type: "weekly_summary", _key: `weekly_${refreshToken}` },
    {
      type: "release_calendar",
      refreshToken,
      _key: "release_calendar",
    },

    { type: "ad", _key: "ad_0" },
    // ── Staggered — spread the network burst so fetches never stack up ─────
    {
      type: "news",
      category: "reviews",
      delay: 1800,
      _key: `news_1_${currentLang}_${refreshToken}`,
    },
    { type: "recommended", _key: `recommended_${refreshToken}` },

    { type: "ad", _key: "ad_1" },
    {
      type: "news",
      category: "esports",
      delay: 3200,
      _key: `news_2_${currentLang}_${refreshToken}`,
    },
    { type: "events", _key: `events_${refreshToken}` },
    { type: "ad", _key: "ad_2" },
    {
      type: "news",
      category: "hardware",
      delay: 4600,
      _key: `news_3_${currentLang}_${refreshToken}`,
    },
  ];
}
