import { useEffect, useMemo, useCallback, useRef } from "react";
import { Query, Models } from "react-native-appwrite";
import { databases, client } from "../lib/appwrite";
import { APPWRITE_DATABASE_ID } from "../lib/config";
import useCachedData from "./useCachedData";

// Fetches and caches a paginated article feed, then keeps it live via
// Appwrite Realtime subscriptions for page 1.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARTICLES_COLLECTION_ID = "articles";
const CACHE_TTL_MS = 600_000; // 10 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Article extends Models.Document {
  category: string;
  siteName: string;
  pubDate: string;
  language?: string;
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

interface FetchResponse {
  articles: Article[];
  total: number;
}

interface RealtimePayload {
  events: string[];
  payload: Article;
}

type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCreateEvent(events: string[]): boolean {
  return events.some((e) => e.includes(".create"));
}

function invokeUnsubscribe(subscription: unknown): void {
  try {
    if (typeof subscription === "function") {
      (subscription as Unsubscribe)();
    } else if (
      subscription &&
      typeof (subscription as { unsubscribe?: () => void }).unsubscribe ===
        "function"
    ) {
      (subscription as { unsubscribe: () => void }).unsubscribe();
    }
  } catch (err) {
    // Swallow INVALID_STATE_ERR thrown when the WebSocket is already closed.
    console.warn("[useFeed] Error during Realtime unsubscribe:", err);
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default function useFeed(
  category: string | undefined,
  siteName?: string,
  page: number = 1,
  limit: number = 10,
  language?: string
): UseFeedResult {
  const cacheKey = useMemo(
    () =>
      `feed_cache_${category ?? "nocat"}_${siteName ?? "all"}_page_${page}_lang_${language ?? "all"}`,
    [category, siteName, page, language]
  );

  const fetchArticles = useCallback(async (): Promise<FetchResponse> => {
    if (!category) return { articles: [], total: 0 };

    const queries = [
      Query.orderDesc("pubDate"),
      Query.equal("category", category),
      Query.limit(limit),
      Query.offset((page - 1) * limit),
    ];

    if (siteName) queries.push(Query.equal("siteName", siteName));
    if (language) queries.push(Query.equal("language", language));

    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      ARTICLES_COLLECTION_ID,
      queries
    );

    return {
      articles: response.documents as unknown as Article[],
      total: response.total,
    };
  }, [category, siteName, page, limit, language]);

  const { data, isLoading: loading, isRefetching, error, refetch, setData } =
    useCachedData<FetchResponse>(
      cacheKey,
      fetchArticles,
      [category, siteName, page, limit, language],
      CACHE_TTL_MS
    );

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;

  // Stable refs so the Realtime callback can read the latest values without
  // being added to the effect's dependency array.
  const articlesRef = useRef<Article[]>(articles);
  const totalRef = useRef<number>(total);

  useEffect(() => {
    articlesRef.current = articles;
    totalRef.current = total;
  }, [articles, total]);

  // ---------------------------------------------------------------------------
  // Realtime subscription — only active on page 1
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!category || page !== 1) return;

    const channel = `databases.${APPWRITE_DATABASE_ID}.collections.${ARTICLES_COLLECTION_ID}.documents`;
    let subscription: unknown;

    try {
      subscription = client.subscribe(channel, (response: RealtimePayload) => {
        if (!isCreateEvent(response.events)) return;

        const newDoc = response.payload;

        // Filter: only handle documents that match the active filters.
        const matchesCategory = newDoc.category === category;
        const matchesSite = siteName ? newDoc.siteName === siteName : true;
        const matchesLang = language ? newDoc.language === language : true;

        if (!matchesCategory || !matchesSite || !matchesLang) return;

        // Guard against duplicate events (Realtime can fire more than once).
        if (articlesRef.current.some((a) => a.$id === newDoc.$id)) return;

        // Prepend and trim to the current page size.
        const updated = [newDoc, ...articlesRef.current].slice(0, limit);
        setData({ articles: updated, total: totalRef.current + 1 });
      });
    } catch (err) {
      console.warn("[useFeed] Error during Realtime subscribe:", err);
    }

    return () => invokeUnsubscribe(subscription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, siteName, page, limit, language, setData]);

  return { articles, total, loading, isRefetching, error, refetch };
}
