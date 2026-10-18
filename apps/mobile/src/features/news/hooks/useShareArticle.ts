import { useCallback } from "react";
import { Share, ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";

export type UseShareArticleParams = {
  articleId: string | undefined;
  title: string;
  link: string;
};

export type UseShareArticleResult = {
  handleShare: () => Promise<void>;
};

const SHARE_DOMAIN = "https://gz1.games";

/**
 * Builds the share handler for a news article: prefers a clean `/news/:id`
 * deep link (shortened via is.gd) and falls back to the original source URL.
 */
export function useShareArticle({
  articleId,
  title,
  link,
}: UseShareArticleParams): UseShareArticleResult {
  const { t } = useTranslation();

  const handleShare = useCallback(async (): Promise<void> => {
    try {
      // All articles have an Appwrite ID → always generate a clean /news/:id deep
      // link. If somehow no ID exists, fall back to the original article URL.
      const shareUrl = articleId ? `${SHARE_DOMAIN}/news/${articleId}` : link;

      let finalUrl = shareUrl;
      try {
        const res = await fetch(
          `https://is.gd/create.php?format=simple&url=${encodeURIComponent(shareUrl)}`,
        );
        if (res.ok) {
          const short = await res.text();
          if (short.startsWith("http")) finalUrl = short;
        } else {
          ToastAndroid.show(
            t("news.details.shareShortenError"),
            ToastAndroid.LONG,
          );
        }
      } catch {
        ToastAndroid.show(t("news.details.shareShortenError"), ToastAndroid.LONG);
      }

      await Share.share({
        message: `${t("news.details.shareMessage")}${finalUrl}`,
        url: finalUrl,
        title,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("[NewsDetails] Share error:", message);
    }
  }, [articleId, title, link, t]);

  return { handleShare };
}
