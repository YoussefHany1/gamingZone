import type { RssFeedMap } from "@/src/hooks/useRssFeeds";
import type { Article, ArticlePlatform } from "@gaming-zone/core";
import type { NewsPlatformFilter } from "./lib/articlePlatforms";

export type { Article } from "@gaming-zone/core";

export type RssFeedSource = {
  name: string;
  image: string | { uri: string };
  language: "ar" | "en";
  website?: string;
  aboutSite?: string;
  isActive?: boolean;
};

export type ArticleParams = {
  id?: string;
  $id?: string;
  language?: string;
  title?: string;
  link?: string;
  thumbnail?: string;
  siteName?: string;
  siteImage?: string;
  pubDate?: string;
  description?: string;
  summary_en?: string;
  summary_ar?: string;
  summary_es?: string;
  summary_fr?: string;
  summary_hi?: string;
  summary_pt_br?: string;
  summary_pt_pt?: string;
  platforms?: string[];
  article?: ArticleParams;
};

export type RootParamList = { NewsDetails: ArticleParams };

export type RouteShape = {
  key: string;
  title: string;
};

export type GenericNewsRouteProps = {
  rssFeeds: RssFeedMap;
  categoryKey: string;
  loading: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
};

export type NewsLanguageFilter = "all" | "ar" | "en";

export type LatestNewsProps = {
  limit?: number;
  language?: string;
  category?: string;
  website?: string | undefined;
  selectedItem?: RssFeedSource | undefined;
  onChangeFeed?: (item: RssFeedSource) => void;
  showDropdown?: boolean;
  showHeaderTitle?: boolean;
  websitesList?: RssFeedSource[];
  showFooter?: boolean;
  scrollEnabled?: boolean;
  enablePagination?: boolean;
  itemsPerPage?: number;
  adInterval?: number;
  mockData?: Article[]; // For preview screens like ThemeScreen
  /** Active platform filter; `undefined` disables filtering (Home/preview). */
  platform?: ArticlePlatform | undefined;
  /** Renders the platform chip row under the source dropdown. */
  showPlatformFilter?: boolean;
  onPlatformChange?: (value: NewsPlatformFilter) => void;
  /** Clears the platform filter from the filtered empty state. */
  onResetPlatform?: () => void;
  /** False while the profile platform is still resolving — keeps the feed idle. */
  feedReady?: boolean;
  /** Language filter for an "All sources" feed (`all` = no language query). */
  languageFilter?: NewsLanguageFilter;
};

// Memoized row component
export type NewsItemProps = {
  item: Article;
  index: number;
  language?: string | undefined;
  onPress: (item: Article) => void;
  t: (key: string, opts?: object) => string;
  adInterval?: number;
  showAds?: boolean;
};

export type DropdownPickerProps = {
  category: string;
  websites?: RssFeedSource[] | undefined;
  value?: RssFeedSource | null;
  onChange?: (item: RssFeedSource) => void;
};

export type SectionData = {
  title: string;
  data: RssFeedSource[];
};

export type SkeletonNewsItemProps = {
  /** ISO language code — used to determine text direction (e.g. "ar" for RTL). */
  language?: string | undefined;
};
