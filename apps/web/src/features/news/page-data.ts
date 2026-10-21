import "server-only";

import { fetchNewsSources, fetchNews } from "./services/api";

/**
 * The four category slugs that double as path segments under /news/<slug>
 * (rendered through the shared news/[id] segment — article ids are 36-char
 * hex, so a slug collision is impossible). Mirrors CATEGORY_ALLOWLIST in
 * services/api.ts; keeping this list there too would be redundant since the
 * fetchers clamp again internally.
 */
export const NEWS_CATEGORY_SLUGS = ["news", "reviews", "esports", "hardware"] as const;
export type NewsCategorySlug = (typeof NEWS_CATEGORY_SLUGS)[number];

export function isNewsCategorySlug(value: string): value is NewsCategorySlug {
  return (NEWS_CATEGORY_SLUGS as readonly string[]).includes(value);
}

/**
 * Everything the /news landing page and /news/<category> segment need to
 * render: the source registry for the category and the article list for its
 * locale-default source. The explicit-source variant (?source=) is resolved
 * client-side by NewsListClient against Appwrite, which keeps this route free of
 * searchParams and therefore ISR-cacheable.
 *
 * The default source is locale-aware (Arabic visitors get an Arabic-language
 * registry member first) and falls back to alphabetical order in English.
 */
export async function getNewsPageData(
  category: NewsCategorySlug,
  locale: string,
): Promise<{
  sources: { name: string; language: string; image?: string }[];
  defaultSource: string;
  articles: Awaited<ReturnType<typeof fetchNews>>;
}> {
  const sources = await fetchNewsSources(category);

  let defaultSource = "";
  if (sources.length > 0) {
    const preferredSources = sources
      .filter((s) => (locale === "ar" ? s.language === "ar" : s.language !== "ar"))
      .sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en"));

    defaultSource =
      preferredSources.length > 0
        ? preferredSources[0].name
        : [...sources].sort((a, b) => a.name.localeCompare(b.name, "en"))[0].name;
  }

  const articles = await fetchNews(category, defaultSource);
  return { sources, defaultSource, articles };
}
