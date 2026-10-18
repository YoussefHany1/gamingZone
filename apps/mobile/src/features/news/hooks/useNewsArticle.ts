import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { getArticleSummary } from "@gaming-zone/utils";
import { databases } from "@/src/lib/appwrite";
import { APPWRITE_DATABASE_ID } from "@/src/lib/config";
import { openLink } from "@/src/lib/browser";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { formatArticleDate, getTimeAgo } from "../lib/articleFormat";
import type { ArticleParams, RootParamList } from "../types";
import { logger } from "@/src/lib/logger";

const ARTICLES_COLLECTION_ID = "articles";

export type UseNewsArticleResult = {
  /** True while the full article is being fetched from Appwrite. */
  isLoadingArticle: boolean;
  /** True once pending interactions have settled — gates the skeleton and the ad. */
  isReady: boolean;
  articleId: string | undefined;
  title: string;
  link: string;
  thumbnail: string;
  siteName: string;
  siteImage: string;
  description: string;
  summary: string;
  isSummaryRtl: boolean;
  currentLang: string;
  formattedDate: string;
  timeAgo: string;
  handleOpenLink: () => void;
};

/**
 * Everything the news-details screen derives from the route article: the
 * Appwrite fallback fetch (when the route only carries an id), the flattened
 * fields, the localized summary and dates, and the "open full article" handler.
 */
export function useNewsArticle(): UseNewsArticleResult {
  const { i18n, t } = useTranslation();
  const route = useRoute<RouteProp<RootParamList, "NewsDetails">>();

  const params = route.params ?? {};
  const article = (params.article ?? params) as ArticleParams;

  const [isLoadingArticle, setIsLoadingArticle] = useState<boolean>(false);
  const [fetchedArticle, setFetchedArticle] = useState<ArticleParams | null>(
    null,
  );
  const [isReady, setIsReady] = useState<boolean>(false);

  const articleId = params.id ?? params.$id ?? article.id ?? article.$id;
  const hasFullDetails = Boolean(article.title && article.link);

  useEffect(() => {
    if (!articleId || hasFullDetails) return;

    let isMounted = true;

    const fetchFromAppwrite = async (): Promise<void> => {
      try {
        setIsLoadingArticle(true);
        const doc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          ARTICLES_COLLECTION_ID,
          articleId,
        );
        if (isMounted) {
          setFetchedArticle({
            id: doc.$id,
            $id: doc.$id,
            title: doc.title,
            link: doc.link,
            thumbnail: doc.thumbnail,
            siteName: doc.siteName,
            siteImage: doc.siteImage,
            pubDate: doc.pubDate,
            description: doc.description,
            language: doc.language,
            summary_en: doc.summary_en,
            summary_ar: doc.summary_ar,
            summary_es: doc.summary_es,
            summary_fr: doc.summary_fr,
            summary_hi: doc.summary_hi,
            summary_pt_br: doc.summary_pt_br,
            summary_pt_pt: doc.summary_pt_pt,
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("[NewsDetails] Error fetching article by ID:", message);
        ToastAndroid.show(
          t("news.fetchError") || "Error loading news details",
          ToastAndroid.SHORT,
        );
      } finally {
        if (isMounted) {
          setIsLoadingArticle(false);
        }
      }
    };

    void fetchFromAppwrite();

    return () => {
      isMounted = false;
    };
  }, [articleId, hasFullDetails, t]);

  useEffect(() => {
    const task = runAfterInteractions(() => setIsReady(true));
    return () => task.cancel();
  }, []);

  const activeArticle = hasFullDetails ? article : (fetchedArticle ?? {});

  const title = activeArticle.title ?? "";
  const link = activeArticle.link ?? "";
  const thumbnail = activeArticle.thumbnail ?? "";
  const siteName = activeArticle.siteName ?? "";
  const siteImage = activeArticle.siteImage ?? "";
  const description = activeArticle.description ?? "";
  // Summary is written in the active UI language (falls back to English),
  // independent of the article's own content language.
  const summary = getArticleSummary(activeArticle, i18n.language);
  const isSummaryRtl = i18n.language.startsWith("ar");
  const currentLang = activeArticle.language ?? i18n.language;

  const formattedDate = useMemo(
    () => formatArticleDate(activeArticle.pubDate ?? "", currentLang),
    [activeArticle.pubDate, currentLang],
  );

  const timeAgo = useMemo(
    () => getTimeAgo(activeArticle.pubDate ?? "", t),
    [activeArticle.pubDate, t],
  );

  const handleOpenLink = useCallback((): void => {
    if (link) openLink(link);
  }, [link]);

  return {
    isLoadingArticle,
    isReady,
    articleId,
    title,
    link,
    thumbnail,
    siteName,
    siteImage,
    description,
    summary,
    isSummaryRtl,
    currentLang,
    formattedDate,
    timeAgo,
    handleOpenLink,
  };
}
