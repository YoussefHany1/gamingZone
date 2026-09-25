import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Article, WeeklySummaryDoc } from "@/types";
import type { Source } from "../types";

// Cross-request TTLs. Every call here previously hit Appwrite on every request.
// These are a fallback only: .github/workflows/trigger-rss.yml calls
// /api/revalidate when articles are actually written, which invalidates the
// matching tags immediately rather than waiting out a window.
//
// The per-request `cache()` below stays OUTSIDE `unstable_cache` so a single
// render pass dedupes before touching the data cache at all.
//
// These TTLs are also a ceiling on the *page* revalidate. Next 16 derives a
// route's revalidate from the lowest TTL among the data-cache entries its
// render touches, so a 5-minute TTL here silently drags the home page (and the
// sitemap, which reads the same fetcher) down to 5 minutes — worse than the
// 10-minute baseline this replaced. Keep these at or above the shortest window
// of any page that reads them: 1800 matches the home page.
const ARTICLES_TTL_SECONDS = 1800;
const FEED_TTL_SECONDS = 1800; // /news is dynamic; TTL is a data-layer floor
const SOURCES_TTL_SECONDS = 21600; // source registry changes rarely
const WEEKLY_SUMMARY_TTL_SECONDS = 3600;
const ARTICLE_TTL_SECONDS = 21600; // article bodies are immutable once published

/**
 * Server-only override for the Appwrite database id; falls back to the
 * public env var used by the client SDK.
 */
function getDatabaseId(): string {
  return (
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    ""
  );
}

/**
 * Strips Appwrite document metadata (undefined values, custom types) so the
 * result can be safely serialized from Server Components to Client Components.
 * Also required for `unstable_cache`, which persists the return value.
 */
function parseAppwriteDocument<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export const fetchServerArticles = cache(
  async (category: string, lang: string): Promise<Article[]> =>
    unstable_cache(
      async () => {
        try {
          const DATABASE_ID = getDatabaseId();

          if (!DATABASE_ID) {
            console.warn("No Database ID provided for articles.");
            return [];
          }

          const response = await databases.listDocuments(
            DATABASE_ID,
            "articles",
            [
              Query.equal("category", category),
              Query.equal("language", lang),
              Query.orderDesc("pubDate"),
              Query.limit(6),
              // Fetch only fields rendered in the UI — reduces Fast Origin Transfer
              Query.select(["$id", "title", "description", "thumbnail", "pubDate", "siteName", "link", "category", "language"]),
            ],
          );

          return parseAppwriteDocument<Article[]>(response.documents);
        } catch (error) {
          console.error(`Error fetching server articles for ${category}:`, error);
          return [];
        }
      },
      ["articles", category, lang],
      {
        revalidate: ARTICLES_TTL_SECONDS,
        tags: ["news", `news:articles:${category}:${lang}`],
      },
    )(),
);

export const fetchServerWeeklySummary = cache(
  async (): Promise<WeeklySummaryDoc | null> =>
    unstable_cache(
      async () => {
        try {
          const DATABASE_ID = getDatabaseId();

          if (!DATABASE_ID) {
            console.warn("No Database ID provided for weekly summary.");
            return null;
          }

          const response = await databases.listDocuments(
            DATABASE_ID,
            "weekly_summaries",
            [Query.orderDesc("$createdAt"), Query.limit(1)],
          );

          if (response.documents.length === 0) return null;

          return parseAppwriteDocument<WeeklySummaryDoc>(response.documents[0]);
        } catch (error) {
          console.error("Error fetching server weekly summary:", error);
          return null;
        }
      },
      ["weekly-summary"],
      {
        revalidate: WEEKLY_SUMMARY_TTL_SECONDS,
        tags: ["news", "news:weekly-summary"],
      },
    )(),
);

export const fetchNewsSources = cache(
  async (category: string): Promise<Source[]> =>
    unstable_cache(
      async () => {
        try {
          const DATABASE_ID = getDatabaseId();

          if (!DATABASE_ID) return [];

          const response = await databases.listDocuments(
            DATABASE_ID,
            "news_sources",
            [Query.equal("category", category), Query.limit(100)],
          );

          return (response.documents as unknown as { name: string; language?: string; image?: string }[]).map(
            (doc) => ({
              name: doc.name,
              language: doc.language || "en",
              image: doc.image,
            }),
          );
        } catch (error) {
          console.error("Error loading news sources:", error);
          return [];
        }
      },
      ["news-sources", category],
      {
        revalidate: SOURCES_TTL_SECONDS,
        tags: ["news", `news:sources:${category}`],
      },
    )(),
);

export const fetchNews = cache(
  async (category: string, siteName: string): Promise<Article[]> =>
    unstable_cache(
      async () => {
        try {
          const DATABASE_ID = getDatabaseId();

          if (!DATABASE_ID) return [];

          const response = await databases.listDocuments(
            DATABASE_ID,
            "articles",
            [
              Query.equal("siteName", siteName),
              Query.equal("category", category),
              Query.orderDesc("pubDate"),
              Query.limit(50),
              // Fetch only fields rendered in the UI — reduces Fast Origin Transfer
              Query.select(["$id", "title", "description", "thumbnail", "pubDate", "siteName", "link", "category", "language"]),
            ],
          );

          return parseAppwriteDocument<Article[]>(response.documents);
        } catch (error) {
          console.error("Error loading news:", error);
          return [];
        }
      },
      ["news-feed", category, siteName],
      {
        revalidate: FEED_TTL_SECONDS,
        tags: ["news", `news:feed:${category}`, `news:source:${siteName}`],
      },
    )(),
);

export const getArticle = cache(
  async (id: string): Promise<Article | null> =>
    unstable_cache(
      async () => {
        try {
          const DATABASE_ID = getDatabaseId();

          if (!DATABASE_ID) return null;
          const doc = await databases.getDocument(DATABASE_ID, "articles", id);
          return parseAppwriteDocument<Article>(doc);
        } catch (error) {
          console.error("Error fetching article in cached fetcher:", error);
          return null;
        }
      },
      ["article", id],
      {
        revalidate: ARTICLE_TTL_SECONDS,
        tags: ["news", `news:article:${id}`],
      },
    )(),
);

export const getNewsSource = cache(
  async (siteName: string): Promise<Source | null> =>
    unstable_cache(
      async () => {
        try {
          const DATABASE_ID = getDatabaseId();
          if (!DATABASE_ID) return null;
          const response = await databases.listDocuments(
            DATABASE_ID,
            "news_sources",
            [Query.equal("name", siteName), Query.limit(1)],
          );
          if (response.documents.length === 0) return null;
          return parseAppwriteDocument<Source>(response.documents[0]);
        } catch (error) {
          console.error("Error fetching news source in cached fetcher:", error);
          return null;
        }
      },
      ["news-source", siteName],
      {
        revalidate: SOURCES_TTL_SECONDS,
        tags: ["news", `news:source:${siteName}`],
      },
    )(),
);
