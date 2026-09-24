import { useState, useEffect } from "react";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Article } from "@/types";

export function useLatestNewsFeed(
  category: string,
  activeLang: string,
  initialArticles?: Article[],
) {
  const [articles, setArticles] = useState<Article[]>(initialArticles || []);
  const [loading, setLoading] = useState(!initialArticles?.length);

  useEffect(() => {
    // Server already provided fresh articles for this category + language
    if (initialArticles && initialArticles.length > 0) return;

    let isCancelled = false;

    async function fetchArticles() {
      try {
        const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";

        if (!DATABASE_ID) return;

        const response = await databases.listDocuments(
          DATABASE_ID,
          "articles",
          [
            Query.equal("category", category),
            Query.equal("language", activeLang),
            Query.orderDesc("pubDate"),
            Query.limit(6),
          ],
        );

        if (!isCancelled) {
          setArticles(response.documents as unknown as Article[]);
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
