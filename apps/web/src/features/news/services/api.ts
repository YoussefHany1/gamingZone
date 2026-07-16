import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Article, WeeklySummaryDoc } from "@/types";

/**
 * Utility to parse Appwrite documents into plain objects
 * so they can be safely passed from Server Components to Client Components.
 */
function parseAppwriteDocument<T>(doc: any): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function fetchServerArticles(
  category: string,
  lang: string,
): Promise<Article[]> {
  try {
    const DATABASE_ID =
      process.env.APPWRITE_DATABASE_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      "";
    const COLLECTION_ID = "articles";

    if (!DATABASE_ID) {
      console.warn("No Database ID provided for articles.");
      return [];
    }

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("category", category),
      Query.equal("language", lang),
      Query.orderDesc("pubDate"),
      Query.limit(6),
    ]);

    return parseAppwriteDocument<Article[]>(response.documents);
  } catch (error) {
    console.error(`Error fetching server articles for ${category}:`, error);
    // Depending on the use case, you might want to throw the error
    // to trigger the closest error.tsx boundary.
    // throw error;
    return [];
  }
}

export async function fetchServerWeeklySummary(): Promise<WeeklySummaryDoc | null> {
  try {
    const DATABASE_ID =
      process.env.APPWRITE_DATABASE_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      "";
    const COLLECTION_ID = "weekly_summaries";

    if (!DATABASE_ID) {
      console.warn("No Database ID provided for weekly summary.");
      return null;
    }

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ]);

    if (response.documents.length === 0) return null;

    return parseAppwriteDocument<WeeklySummaryDoc>(response.documents[0]);
  } catch (error) {
    console.error("Error fetching server weekly summary:", error);
    return null;
  }
}

export async function fetchNewsSources(
  category: string,
): Promise<{ name: string; language: string; image?: string }[]> {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "news_sources";

    if (!DATABASE_ID) return [];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("category", category),
      Query.limit(100),
    ]);

    return response.documents.map((doc: any) => ({
      name: doc.name,
      language: doc.language || "en",
      image: doc.image,
    }));
  } catch (error) {
    console.error("Error loading news sources:", error);
    return [];
  }
}

export async function fetchNews(
  category: string,
  siteName: string,
): Promise<Article[]> {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "articles";

    if (!DATABASE_ID) return [];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("siteName", siteName),
      Query.equal("category", category),
      Query.orderDesc("pubDate"),
      Query.limit(50),
    ]);

    return parseAppwriteDocument<Article[]>(response.documents);
  } catch (error) {
    console.error("Error loading news:", error);
    return [];
  }
}

import { cache } from "react";

export const getArticle = cache(async (id: string): Promise<Article | null> => {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "articles";

    if (!DATABASE_ID) return null;
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, id);
    return parseAppwriteDocument<Article>(doc);
  } catch (error) {
    console.error("Error fetching article in cached fetcher:", error);
    return null;
  }
});

export const getNewsSource = cache(async (siteName: string) => {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    if (!DATABASE_ID) return null;
    const response = await databases.listDocuments(
      DATABASE_ID,
      "news_sources",
      [Query.equal("name", siteName), Query.limit(1)],
    );
    if (response.documents.length === 0) return null;
    return response.documents[0];
  } catch (error) {
    console.error("Error fetching news source in cached fetcher:", error);
    return null;
  }
});
