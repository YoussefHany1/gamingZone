import { cache } from "react";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Article, WeeklySummaryDoc } from "@/types";
import type { Source } from "../types";

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
 */
function parseAppwriteDocument<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export const fetchServerArticles = cache(
  async (category: string, lang: string): Promise<Article[]> => {
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
);

export const fetchServerWeeklySummary = cache(
  async (): Promise<WeeklySummaryDoc | null> => {
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
);

export const fetchNewsSources = cache(
  async (category: string): Promise<Source[]> => {
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
);

export const fetchNews = cache(
  async (category: string, siteName: string): Promise<Article[]> => {
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
);

export const getArticle = cache(async (id: string): Promise<Article | null> => {
  try {
    const DATABASE_ID = getDatabaseId();

    if (!DATABASE_ID) return null;
    const doc = await databases.getDocument(DATABASE_ID, "articles", id);
    return parseAppwriteDocument<Article>(doc);
  } catch (error) {
    console.error("Error fetching article in cached fetcher:", error);
    return null;
  }
});

export const getNewsSource = cache(
  async (siteName: string): Promise<Source | null> => {
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
);
