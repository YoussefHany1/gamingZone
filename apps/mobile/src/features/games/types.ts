import type { Game } from "@/src/types/sharedTypes";
import type {
  Engine,
  FreeGame,
  GameItem,
  GameMode,
  Genre,
  InvolvedCompany,
  LangRow,
  NewsGame,
  PcRequirements,
  Platform,
  Screenshot,
  Video,
  Website,
} from "@gaming-zone/core";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { StyleProp, ViewStyle } from "react-native";
import type { Models } from "react-native-appwrite";
import type { SharedValue } from "react-native-reanimated";

// The IGDB shapes are re-exported from @gaming-zone/core — see the export
// block below. Never re-declare one locally: `npm run check:models` fails the
// build if you do.

// â”€â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type GamesStackParamList = {
  GameDetails: {
    gameID: number | string;
    claimUrl?: string;
    store?: string;
  };
  GameNewsScreen: {
    gameName?: string;
    apiUrl?: string;
    source?: string;
  };
};

// â”€â”€â”€ IGDB raw shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type {
  AgeRating,
  Company,
  Cover,
  Engine,
  FreeGame,
  GameData,
  GameGenre,
  GameItem,
  GameMode,
  GamePlatform,
  GameTimeToBeat,
  Genre,
  InvolvedCompany,
  LangRow,
  LangSupportType,
  Language,
  LanguageSupport,
  NewsGame,
  PcRequirements,
  Platform,
  Screenshot,
  SpecRow,
  Video,
  Website,
} from "@gaming-zone/core";

// â”€â”€â”€ Derived / UI shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AgeRatingInfo = { label: string; color: string };

// â”€â”€â”€ Component Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type GameAboutProps = {
  summary?: string | undefined;
};

export type GameActionButtonsProps = {
  claimUrl?: string | undefined;
  store?: string | undefined;
  onAddToList: () => void;
  isUpcoming?: boolean | undefined;
  isSubscribed?: boolean | undefined;
  onToggleNotification?: (() => void) | undefined;
};

export type GameDetailsBackgroundProps = {
  coverImageId?: string | undefined;
  currentLang: string;
};

export type GameDetailsGridProps = {
  genres?: Genre[] | undefined;
  gameModes?: GameMode[] | undefined;
  involvedCompanies?: InvolvedCompany[] | undefined;
  gameEngines?: Engine[] | undefined;
};

export type GameDetailsMetaProps = {
  name: string;
  /** Unix timestamp in seconds (IGDB first_release_date) */
  releaseDate?: number | undefined;
  platforms?: Platform[] | undefined;
  totalRating?: number | undefined;
  totalRatingCount?: number | undefined;
  ageRating: AgeRatingInfo | null;
};

export type GameHorizontalScrollProps = {
  title: string;
  games: GameItem[];
  onGamePress: (id: number) => void;
};

export type GameHowLongToBeatProps = {
  main: number | null;
  mainExtra: number | null;
  completionist: number | null;
};

export type HoursCircleProps = {
  hours: number;
  /** SVG path \`d\` attribute; omit to render a full circle. */
  pathD?: string;
};

export type GameLanguageTableProps = {
  languageList: LangRow[];
};

export const COLUMN_KEYS = ["Audio", "Subtitles", "Interface"] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export type PcRequirementsTab = "min" | "rec";

export type GamePcRequirementsProps = {
  pcRequirements: PcRequirements | null;
  pcReqLoading: boolean;
};

export type StorePrice = {
  /** IGDB website type associated with the store. */
  type: number;
  /** Current (sale) price in USD. `0` means the game is free. */
  salePrice: number;
  /** Regular price in USD — equals `salePrice` when not discounted. */
  normalPrice: number;
  /** True when the game is currently discounted. */
  isOnSale: boolean;
  /** The store's own page for this game (store page, deal page, …). */
  url: string;
};

export type GameStoresProps = {
  websites?: Website[] | undefined;
  prices?: StorePrice[] | undefined;
  /** Per-store loading flags keyed by IGDB website type. */
  pricesLoading?: Record<number, boolean> | undefined;
};

export type GameTrailerProps = {
  videos?: Video[] | undefined;
};

export type GalleryImage = {
  id: string;
  /** Full-resolution URL shown in the full-screen viewer. */
  url: string;
  /** Reduced-resolution URL shown in the thumbnail strip. */
  thumbnail: string;
};

export type ZoomableImageProps = {
  imageUrl: string;
  onSwipeLeft?: (() => void) | undefined; // navigate forward
  onSwipeRight?: (() => void) | undefined; // navigate backward
  onSwipeDown?: (() => void) | undefined; // close gallery
};

export type ImageGalleryAdvancedProps = {
  coverImageId?: string | undefined;
  screenshots?: Screenshot[] | undefined;
};

export type ComingSoonCardProps = {
  item: Game;
};

export type GameFilters = {
  year: string | null;
  genre: string | null;
  platform: string | null;
  sort: string | null;
};

export type FilterModalProps = {
  visible: boolean;
  filters: GameFilters;
  onApply: (filters: GameFilters) => void;
  onClose: () => void;
};

export type FilterOption = {
  id: string;
  label: string;
};

export type SectionProps = {
  title: string;
  items: FilterOption[] | string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  hideAny?: boolean;
};

export type FreeGameItem = FreeGame & { slug?: string | undefined };

export type TimeUnitProps = {
  value: number;
  label: string;
};

export type CountdownTimerProps = {
  t: (key: string) => string;
  startDate?: string | number;
};

export type FreeGameCardProps = {
  item: FreeGameItem;
  onClaim: (item: FreeGameItem) => void;
  t: (key: string) => string;
};

export type GameCardProps = {
  item: Game;
};

export type GamesListProps = {
  query?: string | undefined;
  filters?: GameFilters | undefined;
  onBack?: (() => void) | undefined;
};

export type NewsGameCardProps = {
  item: NewsGame;
  onPress: (name: string, apiUrl: string, source?: string) => void;
};

export type AnticipatedCardProps = {
  item: Game;
  isSubscribed?: boolean;
  onToggleNotification?: (item: Game) => void;
};

export type NostalgiaCardProps = {
  item: Game;
};

export type PopularCardProps = {
  item: Game;
  index: number;
};

export type RecentGameCardProps = {
  item: Game;
};

export type SteamTopSellersCardProps = {
  item: Game;
  index: number;
};

export type TopRatedCardProps = {
  item: Game;
  index: number;
};

export type TrendingMobileCardProps = {
  item: Game;
  index: number;
};

export type NewsArticle = Models.Document & {
  title?: string;
  description?: string;
  body?: string;
  link?: string;
  thumbnail?: string;
  pubDate?: string;
};
export type NewsSectionProps = {
  gameName: string;
  title: string;
  sourceId: string;
  lang: string;
  defaultExpanded?: boolean;
  rssUrl?: string;
};

export type FeedItemType = "COMPONENT" | "AD";

export type FeedItemConfig = {
  id: string;
  type: FeedItemType;
};

export type AppExtra = {
  APPWRITE_DATABASE_ID?: string;
};

export type NewsItemProps = {
  item: NewsArticle;
  lang: string;
};

export type UseGameDetailsProps = {
  initialGameID: number | string;
  navigation: NativeStackNavigationProp<
    GamesStackParamList,
    "GameDetails"
  >;
};

export type ListSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  gameId?: string | number | undefined;
  gameData?: Record<string, unknown> | undefined;
};

export type Props = NativeStackScreenProps<GamesStackParamList, "GameDetails">;

export type SkeletonBarProps = {
  shimmer: SharedValue<number>;
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};
