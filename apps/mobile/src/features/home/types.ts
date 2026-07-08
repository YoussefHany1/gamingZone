export type WeeklySummaryDoc = {
  $id: string;
  $createdAt: string;
  summary_ar?: string;
  summary_en?: string;
};

export type SectionItem = {
  type: "slideshow" | "news" | "weekly_summary" | "events" | "ad";
  category?: string;
  website?: string;
  _key: string;
  /** ms to wait before mounting this news section. 0 / undefined = immediate. */
  delay?: number;
};
