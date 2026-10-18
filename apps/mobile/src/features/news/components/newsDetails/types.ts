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
};

export type ReadFullArticleButtonProps = {
  onPress: () => void;
};
