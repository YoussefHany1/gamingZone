import { Game } from "@/src/types/sharedTypes";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleProp, ViewStyle } from "react-native";
import { Models } from "react-native-appwrite";
import { SharedValue } from "react-native-reanimated";

export type GameCover = {
  image_id: string;
};

export type GamePlatform = {
  name: string;
  abbreviation?: string;
};

export type GameGenre = {
  name: string;
};

export type FreeGame = {
  id: string;
  title: string;
  image?: string | undefined;
  slug?: string | undefined;
  store?: "steam" | "epic" | string | undefined;
  url?: string | undefined;
  description?: string | undefined;
  type: "current" | "next" | string;
  startDate?: string | number | undefined;
  endDate?: string | number | undefined;
  igdb_game_id?: number | undefined;
};

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

export type AgeRating = {
  organization: number;
  rating_category: number;
};

export type Platform = {
  name: string;
  id: number;
  abbreviation?: string;
};
export type Genre = { id: number; name: string };
export type GameMode = { id: number; name: string };
export type Company = { id: number; name: string };
export type Engine = { id: number; name: string };
export type Video = { video_id?: string; name?: string };
export type Screenshot = { id?: string; image_id: string };
export type Cover = { image_id?: string };
export type Website = { id: number; type: number; url: string };
export type Language = { name: string };
export type LangSupportType = { name: string };

export type LanguageSupport = {
  language: Language;
  language_support_type: LangSupportType;
};

/** All time values are in hours, sourced from HowLongToBeat via IGDB. */
export type GameTimeToBeat = {
  hastily?: number;
  normally?: number;
  completely?: number;
};

export type InvolvedCompany = {
  id: number;
  developer: boolean;
  publisher: boolean;
  company: Company;
};

export type GameData = {
  id: number;
  name: string;
  summary?: string;
  cover?: Cover;
  total_rating?: number;
  total_rating_count?: number;
  release_dates?: { human?: string }[];
  /** Unix timestamp in seconds */
  first_release_date?: number;
  platforms?: Platform[];
  genres?: Genre[];
  game_modes?: GameMode[];
  age_ratings?: AgeRating[];
  involved_companies?: InvolvedCompany[];
  game_engines?: Engine[];
  videos?: Video[];
  screenshots?: Screenshot[];
  language_supports?: LanguageSupport[];
  game_time_to_beats?: GameTimeToBeat;
  websites?: Website[];
  collections?: { games?: { id: number; name: string; cover?: Cover }[] }[];
  similar_games?: { id: number; name: string; cover?: Cover }[];
};

// â”€â”€â”€ Derived / UI shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AgeRatingInfo = { label: string; color: string };

export type LangRow = {
  name: string;
  Audio: boolean;
  Subtitles: boolean;
  Interface: boolean;
};

export type SpecRow = { label: string; value: string };

export type PcRequirements = {
  minimum: SpecRow[];
  recommended: SpecRow[];
};

// â”€â”€â”€ Component Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type GameAboutProps = {
  summary?: string | undefined;
};

export type GameActionButtonsProps = {
  claimUrl?: string | undefined;
  store?: string | undefined;
  onAddToList: () => void;
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

export type GameItem = {
  id: number;
  name: string;
  cover?: Cover;
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
  /** Current (sale) price in USD. */
  salePrice: number;
  /** Regular price in USD. */
  normalPrice: number;
  /** True when the game is currently discounted. */
  isOnSale: boolean;
  /** CheapShark deal page URL for the current offer. */
  url: string;
};

export type GameStoresProps = {
  websites?: Website[] | undefined;
  prices?: StorePrice[] | undefined;
  pricesLoading?: boolean;
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

export type NewsGame = {
  id: string;
  name: string;
  image: string;
  apiUrl: string;
  source?: string;
};

export type NewsGameCardProps = {
  item: NewsGame;
  onPress: (name: string, apiUrl: string, source?: string) => void;
};

export type AnticipatedCardProps = {
  item: Game;
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
  navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<
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
