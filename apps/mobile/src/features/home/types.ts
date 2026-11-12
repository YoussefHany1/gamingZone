export type { WeeklySummaryDoc } from "@gaming-zone/core";

export type SectionItem = {
  type:
    | "slideshow"
    | "quick_actions"
    | "free_games"
    | "news_tabs"
    | "events"
    | "weekly_summary"
    | "release_calendar"
    | "recommended"
    | "ad";
  category?: string;
  website?: string;
  /**
   * Distinct logical id when two entries share a type (the two tab groups:
   * "news_tabs" and "insight_tabs"). Drives the chip scroll targets.
   */
  id?: string;
  _key: string;
  /**
   * Bumped on pull-to-refresh. Passed through to sections that must bypass
   * their cache rather than remount (remounting re-runs the fetch with
   * forceRefresh=false, which falls back to the cached payload).
   */
  refreshToken?: number;
};
