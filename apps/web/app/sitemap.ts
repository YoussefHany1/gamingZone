import { MetadataRoute } from "next";
import { fetchGamesList } from "@/features/games/services/server-cache";
import { fetchServerArticles } from "@/features/news/services/api";
import { getSiteBaseUrl } from "@/lib/metadata";

const NEWS_CATEGORIES = ["news", "reviews", "esports", "hardware"];

// 30m, not 6h. Next derives a route's revalidate from the lowest TTL among the
// data-cache entries it reads, and this route shares fetchServerArticles with
// the home page — so 21600 here would be capped at the news TTL regardless.
// Declaring 1800 keeps the manifest honest instead of implying 6h.
// This is 1 path, so the cost is 48 writes/day.
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
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
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
        sitemapEntries.push({
          url: `${baseUrl}/${locale}/games/${game.id}`,
          lastModified: new Date(),
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
          lastModified: new Date(art.pubDate || Date.now()),
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
