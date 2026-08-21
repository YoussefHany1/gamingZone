import { RssFeedMap } from "@/src/hooks/useRssFeeds";
import type { Article } from "@gaming-zone/core";

export type { Article } from "@gaming-zone/core";

export type RssFeedSource = {
  name: string;
  image: string | { uri: string };
  language: "ar" | "en";
  website?: string;
  aboutSite?: string;
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
};

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
