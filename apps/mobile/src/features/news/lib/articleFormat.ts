import { format, intervalToDuration } from "date-fns";
import type { Locale } from "date-fns";
import { ar, es, fr, hi, pt, ptBR } from "date-fns/locale";
import type { TFunction } from "i18next";

/** date-fns locales for the content languages the app supports. */
const DATE_LOCALES: Record<string, Locale> = {
  ar,
  es,
  fr,
  hi,
  "pt-BR": ptBR,
  "pt-PT": pt,
};

/**
 * Formats an article's publish date in the given content language.
 * Returns "" when the date is missing or unparseable.
 */
export function formatArticleDate(
  pubDate: string,
  currentLang: string,
): string {
  if (!pubDate) return "";
  try {
    const locale = DATE_LOCALES[currentLang];
    return format(
      new Date(pubDate),
      "dd MMMM yyyy - hh:mm a",
      locale ? { locale } : {},
    );
  } catch {
    return "";
  }
}

/**
 * Human-readable "time ago" for an article's publish date.
 * Returns "" when the date is missing or unparseable.
 */
export function getTimeAgo(pubDate: string, t: TFunction): string {
  if (!pubDate) return "";

  const startDate = new Date(pubDate);
  if (isNaN(startDate.getTime())) return "";

  const { years, months, days, hours, minutes } = intervalToDuration({
    start: startDate,
    end: new Date(),
  });

  if (years) return `${years} ${t("news.duration.years")}`;
  if (months) return `${months} ${t("news.duration.months")}`;
  if (days) return `${days} ${t("news.duration.days")}`;
  if (hours) {
    return minutes
      ? `${hours}${t("news.duration.hours")} ${minutes}${t("news.duration.minutes")}`
      : `${hours}${t("news.duration.hours")}`;
  }
  return `${minutes ?? 0}${t("news.duration.minutes")}`;
}
