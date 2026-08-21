import type { WeeklySummaryDoc } from "@gaming-zone/core";

export type { WeeklySummaryDoc } from "@gaming-zone/core";

export type SectionItem = {
  type: "slideshow" | "news" | "weekly_summary" | "recommended" | "events" | "ad";
  category?: string;
  website?: string;
  _key: string;
  /** ms to wait before mounting this news section. 0 / undefined = immediate. */
  delay?: number;
};
