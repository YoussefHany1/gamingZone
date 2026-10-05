import React from "react";
import {
  fetchNewsSources,
  fetchNews,
  clampCategory,
  clampSourceName,
  NewsList,
} from "@/features/news";
import { createLocalizedMetadata } from "@/lib/metadata";

export const generateMetadata = createLocalizedMetadata({
  path: "/news",
  en: {
    title: "Gaming Zone | Gaming News, Reviews & Esports",
    description:
      "Follow instant coverage of the latest gaming news, hardware, reviews, Esports, and more from the best global and regional sources.",
  },
  ar: {
    title: "Gaming Zone | أخبار الألعاب، المراجعات والرياضات الإلكترونية",
    description:
      "تابع تغطية فورية لأحدث أخبار الألعاب، المراجعات، الهاردوير، بطولات الرياضات الإلكترونية Esports وأكثر من أفضل المصادر العربية والعالمية.",
  },
});

// No `revalidate` export: this route reads `searchParams` below, so Next renders
// it dynamically and any segment-level TTL would be inert. The previous
// `revalidate = 600` looked like ISR protection but never applied — the cross
// request caching here comes from the unstable_cache wrappers in
// @/features/news, not from this route. /api/revalidate drops those tags when
// articles are written.

export default async function NewsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; source?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
// Clamp the untrusted query value before it reaches any fetcher, so the
  // sources cache key and `news:sources:*` tag stay within the known set. An
  // unknown category falls back to the default feed rather than erroring: this
  // route is dynamic, and throwing here would turn a bad query string into a 500.
  const currentCategory = clampCategory(searchParams.category);

  // 1. Fetch available sources dynamically
  const sources = await fetchNewsSources(currentCategory);

  // 2. Select default source based on locale
  let defaultSource = "";
  if (sources.length > 0) {
    const preferredSources = sources
      .filter((s) => locale === "ar" ? s.language === "ar" : s.language !== "ar")
      .sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en"));
      
    if (preferredSources.length > 0) {
      defaultSource = preferredSources[0].name;
    } else {
      defaultSource = [...sources].sort((a, b) => a.name.localeCompare(b.name, "en"))[0].name;
    }
  }

  // `?source=` is unvalidated, and it becomes both a cache key segment and a
  // `news:source:<name>` tag. Check it against the registry we just fetched, so
  // a junk value degrades to the locale default instead of minting a
  // permanent, never-invalidated cache entry and an empty feed.
  const requestedSource = clampSourceName(searchParams.source);
  const currentSource =
    requestedSource && sources.some((s) => s.name === requestedSource)
      ? requestedSource
      : defaultSource;
  const articles = await fetchNews(currentCategory, currentSource);

  return (
    <NewsList
      locale={locale}
      currentCategory={currentCategory}
      currentSource={currentSource}
      sources={sources}
      articles={articles}
    />
  );
}
