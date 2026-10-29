import type { ArticlePlatform } from "@gaming-zone/core";

export type NewsDetailsHeaderProps = {
  /** Content language — drives the RTL back-arrow direction. */
  currentLang: string;
  onBack: () => void;
  onShare: () => void;
};

export type NewsArticleImageProps = {
  thumbnail: string;
};

export type NewsArticleMetaProps = {
  siteImage: string;
  siteName: string;
  timeAgo: string;
  formattedDate: string;
  /** Badge-ready platforms; empty for general/all-platform articles. */
  platforms: ArticlePlatform[];
};

export type NewsSummaryCardProps = {
  summary: string;
  /** Render the card RTL (summary language is Arabic). */
  isRtl: boolean;
};

export type NewsDescriptionProps = {
  description: string;
  /** Content language — selects the body font family. */
  currentLang: string;
  isReady?: boolean;
};

export type ReadFullArticleButtonProps = {
  onPress: () => void;
};
