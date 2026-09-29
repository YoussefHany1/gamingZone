import type { WeeklySummaryDoc } from "@gaming-zone/core";

export type { WeeklySummaryDoc } from "@gaming-zone/core";

export type SectionItem = {
  type:
    | "slideshow"
    | "news"
    | "weekly_summary"
    | "release_calendar"
    | "recommended"
    | "events"
    | "ad";
  category?: string;
  website?: string;
  _key: string;
  /** ms to wait before mounting this news section. 0 / undefined = immediate. */
  delay?: number;
  /**
   * Bumped on pull-to-refresh. Passed through to sections that must bypass
   * their cache rather than remount (remounting re-runs the fetch with
   * forceRefresh=false, which falls back to the cached payload).
   */
  refreshToken?: number;
};
