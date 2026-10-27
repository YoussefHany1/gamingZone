import { useEffect, useMemo, useCallback, useRef } from "react";
import type { Models } from "react-native-appwrite";
import { Query } from "react-native-appwrite";
import type { ArticlePlatform } from "@gaming-zone/core";
import { databases, client } from "@/src/lib/appwrite";
import { APPWRITE_DATABASE_ID } from "@/src/lib/config";
import useCachedData from "@/src/hooks/useCachedData";
import { logger } from "@/src/lib/logger";

// Fetches and caches a paginated article feed, then keeps it live via
// Appwrite Realtime subscriptions for page 1.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARTICLES_COLLECTION_ID = "articles";
// Primary feed (news + page 1) has a Realtime subscription that pushes updates,
// so a longer TTL is fine. Other category/page combinations get a shorter TTL
// so users see fresh content without waiting too long.
const CACHE_TTL_PRIMARY_MS = 600_000; // 10 minutes — backed by Realtime
const CACHE_TTL_SECONDARY_MS = 300_000; // 5 minutes — no live subscription

/**
 * UI languages whose content is served from the English article pool. Arabic is
 * stored natively; English is stored as-is; everything else has no dedicated
 * articles in the collection.
 */
const OTHER_CONTENT_LANGUAGES = new Set([
  "en",
  "es",
  "fr",
  "hi",
  "pt",
  "pt-BR",
  "pt-PT",
]);

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
  description?: string;
  link?: string;
  /** Per-language AI summaries (resolved by UI locale with English fallback). */
  summary_en?: string;
  summary_ar?: string;
  summary_es?: string;
  summary_fr?: string;
  summary_hi?: string;
  summary_pt_br?: string;
  summary_pt_pt?: string;
  /**
   * Platforms the article covers. General news stores all six ids, so it
   * matches every filter. Missing on documents that predate classification.
   */
  platforms?: ArticlePlatform[];
  platforms_source?: string;
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
      typeof (subscription as { unsubscribe?: () => void }).unsubscribe === "function"
    ) {
      (subscription as { unsubscribe: () => void }).unsubscribe();
    }
  } catch (err) {
    // Swallow INVALID_STATE_ERR thrown when the WebSocket is already closed.
    logger.warn("[useFeed] Error during Realtime unsubscribe:", err);
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
  language?: string,
  enabled: boolean = true,
  platform?: ArticlePlatform,
  languageFilter?: string | null,
): UseFeedResult {
  // Article storage only has "ar"/"en" content — every other UI language reuses
  // the English feed so the list is never empty just because the app is in
  // Spanish, French, Hindi or Portuguese.
  const contentLanguage =
    language === "ar"
      ? "ar"
      : language && OTHER_CONTENT_LANGUAGES.has(language)
        ? "en"
        : language;

  // `undefined` = derive from the source/app language, `null`/`"all"` = no
  // language query (the "All languages" source entry).
  const activeLanguage =
    languageFilter === undefined
      ? contentLanguage
      : languageFilter === null || languageFilter === "all"
        ? undefined
        : languageFilter;

  const cacheKey = useMemo(
    () =>
      `feed_cache_v2_${category ?? "nocat"}_${siteName ?? "all"}_page_${page}_lang_${activeLanguage ?? "all"}_plat_${platform ?? "all"}`,
    [category, siteName, page, activeLanguage, platform],
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
    if (activeLanguage) queries.push(Query.equal("language", activeLanguage));
    // Array containment: general articles store all six ids, so they match
    // every platform. Appwrite cannot index array attributes, but `contains`
    // works without an index on the `platforms` array.
    if (platform) queries.push(Query.contains("platforms", [platform]));

    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      ARTICLES_COLLECTION_ID,
      queries,
    );

    return {
      articles: response.documents as unknown as Article[],
      total: response.total,
    };
  }, [category, siteName, page, limit, activeLanguage, platform]);

  // Use the longer TTL only for the primary feed (news, page 1) which has a
  // Realtime subscription keeping it fresh. All other feeds use the shorter one.
  const isPrimaryFeed = category === "news" && page === 1;
  const cacheTtl = isPrimaryFeed ? CACHE_TTL_PRIMARY_MS : CACHE_TTL_SECONDARY_MS;

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
    [category, siteName, page, limit, activeLanguage, platform],
    cacheTtl,
    enabled,
  );

  // Memoised so `articles` keeps its identity between renders — the `[]`
  // fallback would otherwise be a fresh array each render, re-running the
  // ref-sync effect below and invalidating every consumer memo that reads it.
  const articles = useMemo(() => data?.articles ?? [], [data?.articles]);
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
  // Realtime subscription — only active on page 1 AND the primary category
  // Limiting to one active subscription prevents multiple WebSocket connections
  // from running simultaneously, which causes hangs on weak devices.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only subscribe for the primary "news" feed, page 1
    const isPrimaryFeed = category === "news" && page === 1;
    if (!isPrimaryFeed) return;

    const channel = `databases.${APPWRITE_DATABASE_ID}.collections.${ARTICLES_COLLECTION_ID}.documents`;
    let subscription: unknown;

    try {
      subscription = client.subscribe(channel, (response: RealtimePayload) => {
        if (!isCreateEvent(response.events)) return;

        const newDoc = response.payload;

        // Filter: only handle documents that match the active filters.
        const matchesCategory = newDoc.category === category;
        const matchesSite = siteName ? newDoc.siteName === siteName : true;
        const matchesLang = activeLanguage ? newDoc.language === activeLanguage : true;
        // General articles carry every platform, so `.includes` matches them
        // under each filter; documents without `platforms` only match "All".
        const matchesPlatform = platform
          ? Array.isArray(newDoc.platforms) && newDoc.platforms.includes(platform)
          : true;

        if (!matchesCategory || !matchesSite || !matchesLang || !matchesPlatform) return;

        // Guard against duplicate events (Realtime can fire more than once).
        if (articlesRef.current.some((a) => a.$id === newDoc.$id)) return;

        // Prepend and trim to the current page size.
        const updated = [newDoc, ...articlesRef.current].slice(0, limit);
        setData({ articles: updated, total: totalRef.current + 1 });
      });
    } catch (err) {
      logger.warn("[useFeed] Error during Realtime subscribe:", err);
    }

    return () => invokeUnsubscribe(subscription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, siteName, page, limit, activeLanguage, platform, setData]);

  return { articles, total, loading, isRefetching, error, refetch };
}
