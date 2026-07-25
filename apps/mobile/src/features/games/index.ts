/**
 * Barrel export for the `games` feature.
 *
 * Import hooks, types, and screens from this single entry-point
 * instead of reaching into nested directories:
 *
 * @example
 * import { useGames, useGameDetails, type GameData } from '@/src/features/games';
 */

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useGames } from "./hooks/useGames";
export { useGameDetails } from "./hooks/useGameDetails";

// ── Types (re-exported for consumers) ────────────────────────────────────────
export type {
  GameData,
  GameFilters,
  GameItem,
  FreeGame,
  FreeGameItem,
  NewsGame,
  NewsArticle,
  GamesStackParamList,
  Platform,
  Genre,
  GameMode,
  Company,
  Engine,
  Video,
  Screenshot,
  Cover,
  Website,
  Language,
  LanguageSupport,
  GameTimeToBeat,
  InvolvedCompany,
  AgeRating,
  AgeRatingInfo,
  LangRow,
  SpecRow,
  PcRequirements,
  GalleryImage,
  // Component props
  GameAboutProps,
  GameActionButtonsProps,
  GameDetailsBackgroundProps,
  GameDetailsGridProps,
  GameDetailsMetaProps,
  GameHorizontalScrollProps,
  GameHowLongToBeatProps,
  GameLanguageTableProps,
  GamePcRequirementsProps,
  GameStoresProps,
  GameTrailerProps,
  GameCardProps,
  GamesListProps,
  FilterModalProps,
  FreeGameCardProps,
  NewsGameCardProps,
  // Skeleton
  SkeletonBarProps,
} from "./types";

// ── Screens ───────────────────────────────────────────────────────────────────
export { default as GamesScreen } from "./screens/GamesScreen";
export { default as GameDetailsScreen } from "./screens/GameDetailsScreen";
