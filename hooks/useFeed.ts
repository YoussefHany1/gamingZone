import { useEffect, useMemo, useCallback, useRef } from "react";
import { Query, Models } from "react-native-appwrite";
import { databases, client } from "../lib/appwrite";
import Constants from "expo-constants";
import useCachedData from "./useCachedData";

// Fetches and caches a paginated article feed, then keeps it live via

// Config
interface AppExtra {
  APPWRITE_DATABASE_ID?: string;
}

const { APPWRITE_DATABASE_ID } = (Constants.expoConfig?.extra ?? {}) as AppExtra;
const ARTICLES_COLLECTION_ID = "articles" as const;
const MAX_ARTICLES = 200 as const;

// Types
export interface Article extends Models.Document {
  category: string;
  siteName: string;
  pubDate: string;
  title?: string;
  thumbnail?: string;
}
export interface UseFeedResult {
  articles: Article[];
  loading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
interface RealtimeResponse {
  events: string[];
  payload: Article;
}
type Unsubscribe = () => void;

// main
export default function useFeed(
  category: string | undefined,
  siteName?: string
): UseFeedResult {

  const cacheKey = useMemo(
    () => `feed_cache_${category ?? "nocat"}_${siteName ?? "all"}`,
    [category, siteName]
  );

  const fetchArticles = useCallback(async (): Promise<Article[]> => {
    if (!category) return [];

    const queries = [
      Query.orderDesc("pubDate"),
      Query.equal("category", category),
      Query.limit(MAX_ARTICLES),
    ];

    if (siteName) {
      queries.push(Query.equal("siteName", siteName));
    }

    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID ?? "",
      ARTICLES_COLLECTION_ID,
      queries
    );

    return (response.documents as unknown as Article[]) ?? [];
  }, [category, siteName]);

  const {
    data: articles,
    isLoading: loading,
    isRefetching,
    error,
    refetch,
    setData,
  } = useCachedData<Article[]>(cacheKey, fetchArticles, [category, siteName]);

  // Keep a ref that always holds the latest articles list so the Realtime
  // subscription callback can read it without being in the effect's deps.
  const articlesRef = useRef<Article[]>(articles ?? []);
  useEffect(() => {
    articlesRef.current = articles ?? [];
  }, [articles]);

  // Realtime Subscription
  // Only re-subscribes when category or siteName actually change — NOT on
  // every new article, which was the previous source of the re-subscribe loop.
  useEffect(() => {
    if (!category) return;

    const channel = `databases.${APPWRITE_DATABASE_ID}.collections.${ARTICLES_COLLECTION_ID}.documents`;

    const subscription = client.subscribe(
      channel,
      (response: RealtimeResponse) => {
        // Only react to document creation events
        const isCreateEvent = response.events.some((e) =>
          e.includes(".create")
        );
        if (!isCreateEvent) return;

        const newDoc = response.payload;

        // Filter: new document must match the current category + site filters
        const matchesCategory = newDoc.category === category;
        const matchesSite = siteName ? newDoc.siteName === siteName : true;

        if (!matchesCategory || !matchesSite) return;

        // Read the live articles from the ref — no re-subscribe needed
        const currentArticles = articlesRef.current;

        // Guard against duplicate events from Realtime
        const alreadyExists = currentArticles.some(
          (a) => a.$id === newDoc.$id
        );
        if (alreadyExists) return;

        // Prepend new article and trim to MAX_ARTICLES
        const updated = [newDoc, ...currentArticles].slice(0, MAX_ARTICLES);
        setData(updated);
      }
    ) as unknown as Unsubscribe;

    return () => {
      // Unsubscribe on cleanup regardless of the shape client.subscribe returns
      if (typeof subscription === "function") {
        subscription();
      } else if (
        subscription &&
        typeof (subscription as unknown as { unsubscribe: () => void })
          .unsubscribe === "function"
      ) {
        (subscription as unknown as { unsubscribe: () => void }).unsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, siteName, setData]);

  return {
    articles: articles ?? [],
    loading,
    isRefetching,
    error,
    refetch,
  };
}