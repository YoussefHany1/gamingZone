import type { RssSource } from "@/src/hooks/useRssFeeds";

/** The RSS categories the notification screen exposes, in display order. */
export const NEWS_CATEGORIES = ["news", "reviews", "esports", "hardware"] as const;

/** Topic coordinates for the free-games alert, matching the backend's `FreeGames.js`. */
export const FREE_GAMES_CATEGORY = "free_games";
export const FREE_GAMES_SOURCE = "alerts";

/** Topic coordinates for the weekly summary alert. */
export const WEEKLY_SUMMARY_CATEGORY = "weekly_summary";
export const WEEKLY_SUMMARY_SOURCE = "alerts";

export type SourceGroup = {
  language: "ar" | "en";
  data: RssSource[];
};

const byName = (a: RssSource, b: RssSource): number => a.name.localeCompare(b.name);

/**
 * Splits a category's sources into Arabic and English groups, each sorted by
 * name, with the group matching the app's current language listed first.
 * Empty groups are dropped so a heading is never rendered over nothing.
 */
export function groupSourcesByLanguage(
  sources: RssSource[],
  isEnglishApp: boolean,
): SourceGroup[] {
  const arabic = sources.filter((source) => source.language === "ar").sort(byName);
  const english = sources.filter((source) => source.language === "en").sort(byName);

  const ordered: SourceGroup[] = isEnglishApp
    ? [
        { language: "en", data: english },
        { language: "ar", data: arabic },
      ]
    : [
        { language: "ar", data: arabic },
        { language: "en", data: english },
      ];

  return ordered.filter((group) => group.data.length > 0);
}
