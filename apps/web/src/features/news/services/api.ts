import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Article, WeeklySummaryDoc } from "@/types";
import type { Source } from "../types";

// Cross-request TTLs. Every call here previously hit Appwrite on every request.
// These are the sole freshness mechanism: new articles age into the caches as
// these windows lapse and the next regeneration picks them up.
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
 * The full category set, matching the `category` attribute on articles and on
 * the news_sources registry.
 *
 * This doubles as the cache-key allowlist for the fetchers below. `category`
 * reaches this module straight from `searchParams` on /news, and both the
 * `unstable_cache` key and its `news:articles:*` / `news:sources:*` /
 * `news:feed:*` tags are derived from it. Unvalidated, every distinct string a
 * visitor could put in the query string would mint its own permanent data-cache
 * entry and tag, and each one rewrites on every TTL expiry until evicted —
 * unbounded growth driven purely by hostile or accidental URLs. Clamping at the
 * boundary keeps the key space at 4 x locales.
 */
const CATEGORY_ALLOWLIST = ["news", "reviews", "esports", "hardware"] as const;
type NewsCategory = (typeof CATEGORY_ALLOWLIST)[number];
const DEFAULT_CATEGORY: NewsCategory = "news";

/**
 * Source names are free text in Appwrite, but they are *not* user-supplied in
 * the normal flow: they come from the news_sources registry and appear in the
 * dropdown. `?source=` is user-supplied though, so it is length-capped and
 * charset-restricted before it reaches a cache key or tag. Source *identity* is
 * validated against the registry by the caller (see /news), which is the only
 * place that has already fetched it.
 */
const MAX_SOURCE_NAME_LENGTH = 64;
const SOURCE_NAME_PATTERN = /^[\p{L}\p{N} .:'&()\-_/]+$/u;

/**
 * Normalizes an untrusted category to a known one. Anything unrecognised
 * becomes the default rather than erroring: /news is a dynamic route, so
 * throwing here would turn a bad query string into a 500 instead of falling
 * back to the default feed.
 */
export function clampCategory(value: unknown): NewsCategory {
  return typeof value === "string" &&
    (CATEGORY_ALLOWLIST as readonly string[]).includes(value)
    ? (value as NewsCategory)
    : DEFAULT_CATEGORY;
}

/**
 * Normalizes an untrusted source name. Returns "" when the input cannot be a
 * real source name, which callers treat as "no explicit source selected" and
 * resolve from the registry instead — so a junk `?source=` degrades to the
 * default source rather than an empty feed.
 */
export function clampSourceName(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_SOURCE_NAME_LENGTH) return "";
  return SOURCE_NAME_PATTERN.test(trimmed) ? trimmed : "";
}

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

/**
 * Clamping happens here, outside `unstable_cache`, so the cache key and tags
 * are always built from an already-validated value — clamping inside the inner
 * function would let arbitrary strings create the key entry regardless.
 */
export const fetchServerArticles = cache(
  async (rawCategory: string, lang: string): Promise<Article[]> => {
    // Clamp outside unstable_cache so the key and tag below are always built
    // from an allowlisted category. Clamping inside the inner function would let
    // arbitrary strings create the key entry anyway.
    const category = clampCategory(rawCategory);

    return unstable_cache(
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
    )();
  },
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
  async (rawCategory: string): Promise<Source[]> => {
    const category = clampCategory(rawCategory);

    return unstable_cache(
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
    )();
  },
);

export const fetchNews = cache(
  async (rawCategory: string, rawSiteName: string): Promise<Article[]> => {
    const category = clampCategory(rawCategory);
    const siteName = clampSourceName(rawSiteName);

    return unstable_cache(
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
    )();
  },
);

/**
 * Article ids are Appwrite document ids reached from the `/news/[id]` path
 * segment, so they are unvalidated user input. Without the clamp, each junk id
 * mints a permanent cache entry *and* a `news:article:<id>` tag that nothing can
 * ever invalidate — the tag namespace grows without bound and each entry rewrites
 * on every TTL expiry. Appwrite ids are 36-char hex, so anything else is a 404
 * that we can reject without a database round trip.
 */
const ARTICLE_ID_PATTERN = /^[a-fA-F0-9]{36}$/;

export const getArticle = cache(
  async (rawId: string): Promise<Article | null> => {
    const id = rawId.trim();

    // Validated before the cache key is built — clamping inside the inner
    // function would still create the entry for whatever was passed in.
    if (!ARTICLE_ID_PATTERN.test(id)) return null;

    return unstable_cache(
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
    )();
  },
);

export const getNewsSource = cache(
  async (rawSiteName: string): Promise<Source | null> => {
    const siteName = clampSourceName(rawSiteName);

    return unstable_cache(
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
    )();
  },
);
