import { useCallback } from "react";
import { Query, Models } from "react-native-appwrite";
import { databases } from "../lib/appwrite";
import Constants from "expo-constants";
import useCachedData from "./useCachedData";

// Fetches and caches the full list of RSS sources

// Config
interface AppExtra {
  APPWRITE_DATABASE_ID?: string;
}

const { APPWRITE_DATABASE_ID } = (Constants.expoConfig?.extra ?? {}) as AppExtra;
const RSS_COLLECTION_ID = "news_sources" as const;
const CACHE_KEY = "RSS_FEEDS_CACHE" as const;

// Types
export interface RssSource extends Models.Document {
  name: string;
  category: string;
  language?: string;
  image?: string;
  rssUrl?: string;
  website?: string;
}
export type RssFeedMap = Record<string, RssSource[]>;
export interface UseRssFeedsResult {
  rssFeeds: RssFeedMap;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// main
const useRssFeeds = (): UseRssFeedsResult => {
  const fetchAndTransformFeeds = useCallback(async (): Promise<RssFeedMap> => {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID ?? "",
      RSS_COLLECTION_ID,
      [Query.limit(100)]
    );

    const feeds: RssFeedMap = {};

    (response.documents as unknown as RssSource[]).forEach((doc) => {
      const { category } = doc;

      if (!feeds[category]) {
        feeds[category] = [];
      }

      feeds[category].push({
        ...doc,
        name: doc.name,
        language: doc.language ?? "en",
        image: doc.image,
        website: doc.rssUrl ?? doc.website,
      });
    });

    return feeds;
  }, []);

  const {
    data: rssFeeds,
    isLoading: loading,
    error,
    refetch,
  } = useCachedData<RssFeedMap>(CACHE_KEY, fetchAndTransformFeeds);

  return {
    rssFeeds: rssFeeds ?? {},
    loading,
    error,
    refetch,
  };
};

export default useRssFeeds;