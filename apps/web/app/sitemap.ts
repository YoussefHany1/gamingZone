import { MetadataRoute } from "next";
import { fetchGamesList } from "@/features/games/services/server-cache";
import { fetchServerArticles } from "@/features/news/services/api";
import { getSiteBaseUrl } from "@/lib/metadata";

const NEWS_CATEGORIES = ["news", "reviews", "esports", "hardware"];

// 30m, not 6h. Next derives a route's revalidate from the lowest TTL among the
// data-cache entries it reads, and this route shares fetchServerArticles with
// the home page — so 21600 here would be capped at the news TTL regardless.
// Declaring 1800 keeps the manifest honest instead of implying 6h.
//
// The regeneration count below is not the cost: Vercel bills ISR writes in 8 KB
// units of *changed* output, and a regeneration that reproduces the previous
// bytes is free. That is why nothing below may use `new Date()` — a wall-clock
// stamp made every one of these 48 daily regenerations differ from the last and
// turned them into guaranteed billed writes. Keep every field derived from
// content or absent.
export const revalidate = 1800;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  const locales = ["en", "ar"];

  // 1. Static Routes
  // No /events entry: only app/[locale]/(main)/events/[id] exists, so /events
  // 404s. Nothing in the UI links to it either — advertising it in the sitemap
  // just spent crawl budget on a 404.
  const staticRoutes = ["", "/games", "/news"];
  const sitemapEntries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    staticRoutes.forEach((route) => {
      // No lastModified: these routes are not content-driven, so a timestamp
      // would only ever be a fresh `new Date()` — a billed write per entry per
      // regeneration. changeFrequency already tells crawlers when to return.
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1 : 0.8,
      });
    });
  });

  // 2. Dynamic Games
  try {
    const popularGames = await fetchGamesList("popular");
    popularGames.forEach((game) => {
      locales.forEach((locale) => {
        // The Game type carries no updated-at timestamp (only
        // first_release_date, which is not a modification date), so omit
        // lastModified rather than report a release date as one.
        sitemapEntries.push({
          url: `${baseUrl}/${locale}/games/${game.id}`,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      });
    });
  } catch (e) {
    console.error("Sitemap: Failed to fetch games", e);
  }

  // 3. Dynamic News
  try {
    const articlesByCategory = await Promise.all(
      NEWS_CATEGORIES.map(async (category) => {
        const [en, ar] = await Promise.all([
          fetchServerArticles(category, "en"),
          fetchServerArticles(category, "ar"),
        ]);
        return [...en, ...ar];
      }),
    );

    const allNews = articlesByCategory.flat();

    allNews.forEach((art) => {
      // News articles are available in both locales in the UI, even if content is one language
      locales.forEach((locale) => {
        sitemapEntries.push({
          url: `${baseUrl}/${locale}/news/${art.$id}`,
          // pubDate is written by the RSS job and is therefore stable across
          // regenerations. The previous `|| Date.now()` fallback made a missing
          // date non-deterministic, which is billed as a write.
          ...(art.pubDate && { lastModified: new Date(art.pubDate) }),
          changeFrequency: "never",
          priority: 0.6,
        });
      });
    });
  } catch (e) {
    console.error("Sitemap: Failed to fetch news", e);
  }

  return sitemapEntries;
}
