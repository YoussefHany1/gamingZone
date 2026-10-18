import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useRssFeeds from "@/src/hooks/useRssFeeds";
import type { RssFeedMap } from "@/src/hooks/useRssFeeds";
import type { RouteShape } from "../types";

export type UseNewsTabsResult = {
  index: number;
  handleIndexChange: (index: number) => void;
  routes: RouteShape[];
  rssFeeds: RssFeedMap;
  loading: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
};

/**
 * Tab state and RSS data for the news screen: the active tab index, the
 * localized tab routes, and the shared RSS feed map every scene renders from.
 */
export function useNewsTabs(): UseNewsTabsResult {
  const { t } = useTranslation();
  const [index, setIndex] = useState<number>(0);
  const { rssFeeds, loading, error, refetch } = useRssFeeds();

  const routes = useMemo<RouteShape[]>(
    () => [
      { key: "news", title: t("news.tabs.news") ?? "News" },
      { key: "reviews", title: t("news.tabs.reviews") ?? "Reviews" },
      { key: "esports", title: t("news.tabs.esports") ?? "Esports" },
      { key: "hardware", title: t("news.tabs.hardware") ?? "Hardware" },
    ],
    [t],
  );

  const handleIndexChange = useCallback((nextIndex: number): void => {
    setIndex(nextIndex);
  }, []);

  return {
    index,
    handleIndexChange,
    routes,
    rssFeeds,
    loading,
    error,
    refetch,
  };
}
