import { useEffect, useMemo, useCallback, useRef } from "react";
import { Query, Models } from "react-native-appwrite";
import { databases, client } from "../lib/appwrite";
import Constants from "expo-constants";
import useCachedData from "./useCachedData";

// Fetches and caches a paginated article feed, then keeps it live via Realtime subscriptions.

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
  total: number;
  loading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
}
interface RealtimeResponse {
  events: string[];
  payload: Article;
}
type Unsubscribe = () => void;

interface FetchResponse {
  articles: Article[];
  total: number;
}

export default function useFeed(
  category: string | undefined,
  siteName?: string,
  page: number = 1,
  limit: number = 10,
  language?: string
): UseFeedResult {

  const cacheKey = useMemo(
    () => `feed_cache_${category ?? "nocat"}_${siteName ?? "all"}_page_${page}_lang_${language ?? "all"}`,
    [category, siteName, page, language]
  );

  const fetchArticles = useCallback(async (): Promise<FetchResponse> => {
    if (!category) return { articles: [], total: 0 };

    const offset = (page - 1) * limit;

    const queries = [
      Query.orderDesc("pubDate"),
      Query.equal("category", category),
      Query.limit(limit),
      Query.offset(offset),
    ];

    if (siteName) {
      queries.push(Query.equal("siteName", siteName));
    }

    if (language) {
      queries.push(Query.equal("language", language));
    }

    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID ?? "",
      ARTICLES_COLLECTION_ID,
      queries
    );

    return {
      articles: (response.documents as unknown as Article[]) ?? [],
      total: response.total ?? 0,
    };
  }, [category, siteName, page, limit, language]);

  const {
    data,
    isLoading: loading,
    isRefetching,
    error,
    refetch,
    setData,
  } = useCachedData<FetchResponse>(
    cacheKey, 
    fetchArticles, 
    [category, siteName, page, limit, language],
    600000 // 10-minute cache TTL
  );

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;

  // Keep refs that always hold the latest data so the Realtime
  // subscription callback can read it without being in the effect's deps.
  const articlesRef = useRef<Article[]>(articles);
  const totalRef = useRef<number>(total);
  useEffect(() => {
    articlesRef.current = articles;
    totalRef.current = total;
  }, [articles, total]);

  // Realtime Subscription
  useEffect(() => {
    if (!category || page !== 1) return;

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

        // Filter: new document must match the current category + site + language filters
        const matchesCategory = newDoc.category === category;
        const matchesSite = siteName ? newDoc.siteName === siteName : true;
        const matchesLang = language ? (newDoc as any).language === language : true;

        if (!matchesCategory || !matchesSite || !matchesLang) return;

        // Read the live articles from the ref — no re-subscribe needed
        const currentArticles = articlesRef.current;

        // Guard against duplicate events from Realtime
        const alreadyExists = currentArticles.some(
          (a) => a.$id === newDoc.$id
        );
        if (alreadyExists) return;

        // Prepend new article and trim to limit
        const updated = [newDoc, ...currentArticles].slice(0, limit);
        setData({ articles: updated, total: totalRef.current + 1 });
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
  }, [category, siteName, page, limit, language, setData]);

  return {
    articles,
    total,
    loading,
    isRefetching,
    error,
    refetch,
  };
}
