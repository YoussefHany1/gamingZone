import { useState, useEffect } from "react";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Article } from "@/types";

const memCache = new Map<string, { data: Article[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function useLatestNewsFeed(category: string, activeLang: string, initialArticles?: Article[]) {
  const [articles, setArticles] = useState<Article[]>(initialArticles || []);
  const [loading, setLoading] = useState(!initialArticles);

  useEffect(() => {
    if (
      initialArticles &&
      initialArticles.length > 0 &&
      initialArticles[0].category === category &&
      initialArticles[0].language === activeLang
    ) {
      setArticles(initialArticles);
      setLoading(false);
      return;
    }

    const cacheKey = `${category}_${activeLang}`;
    const cached = memCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setArticles(cached.data);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    async function fetchArticles() {
      setLoading(true);
      try {
        const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
        const COLLECTION_ID = "articles";

        if (!DATABASE_ID) return;

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_ID,
          [
            Query.equal("category", category),
            Query.equal("language", activeLang),
            Query.orderDesc("pubDate"),
            Query.limit(6),
          ],
        );

        if (!isCancelled) {
          const fetchedArticles = response.documents as unknown as Article[];
          setArticles(fetchedArticles);
          memCache.set(cacheKey, { data: fetchedArticles, ts: Date.now() });
        }
      } catch (error) {
        console.error("Error fetching news feed articles:", error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    fetchArticles();

    return () => {
      isCancelled = true;
    };
  }, [category, activeLang, initialArticles]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(activeLang === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return { articles, loading, formatDate };
}
