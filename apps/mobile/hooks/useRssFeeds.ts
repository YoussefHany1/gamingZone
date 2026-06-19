import { useCallback } from "react";
import { Query, Models } from "react-native-appwrite";
import { databases } from "../lib/appwrite";
import { APPWRITE_DATABASE_ID } from "../lib/config";
import useCachedData from "./useCachedData";

// Fetches and caches the full list of RSS sources, grouped by category.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RSS_COLLECTION_ID = "news_sources";
const CACHE_KEY = "RSS_FEEDS_CACHE";
const CACHE_TTL_MS = 86_400_000; // 24 hours — the source list is highly static

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RssSource extends Models.Document {
  name: string;
  category: string;
  language?: string;
  image?: string;
  /** The resolved URL — may originate from either rssUrl or website on the backend. */
  url?: string;
}

/** Articles grouped by their category key. */
export type RssFeedMap = Record<string, RssSource[]>;

export interface UseRssFeedsResult {
  rssFeeds: RssFeedMap;
  loading: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RawSource = RssSource & { rssUrl?: string; website?: string };

function groupByCategory(documents: RawSource[]): RssFeedMap {
  return documents.reduce<RssFeedMap>((map, doc) => {
    const { category } = doc;

    const source: RssSource = {
      ...doc,
      language: doc.language ?? "en",
      // Prefer rssUrl over website; expose as a generic 'url' field.
      url: doc.rssUrl ?? doc.website,
    };

    if (!map[category]) map[category] = [];
    map[category].push(source);

    return map;
  }, {});
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const useRssFeeds = (): UseRssFeedsResult => {
  const fetchFeeds = useCallback(async (): Promise<RssFeedMap> => {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      RSS_COLLECTION_ID,
      [Query.limit(100)]
    );

    return groupByCategory(response.documents as unknown as RawSource[]);
  }, []);

  const { data: rssFeeds, isLoading: loading, error, refetch } =
    useCachedData<RssFeedMap>(CACHE_KEY, fetchFeeds, [], CACHE_TTL_MS);

  return {
    rssFeeds: rssFeeds ?? {},
    loading,
    error,
    refetch,
  };
};

export default useRssFeeds;
