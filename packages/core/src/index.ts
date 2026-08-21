/**
 * Shared domain types for Gaming Zone — used by both the web (Next.js) and
 * mobile (React Native / Expo) apps. Pure types only, no runtime code.
 */

// ---------------------------------------------------------------------------
// IGDB raw shapes
// ---------------------------------------------------------------------------

export interface Cover {
  image_id?: string;
}

export interface Website {
  id: number;
  type: number;
  url: string;
}

export interface Company {
  id: number;
  name: string;
}

export interface InvolvedCompany {
  id: number;
  developer: boolean;
  publisher: boolean;
  company: Company;
}

export interface Platform {
  id: number;
  name: string;
  abbreviation?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface GameMode {
  id: number;
  name: string;
}

export interface Engine {
  id: number;
  name: string;
}

export interface Video {
  video_id: string;
  name?: string;
}

export interface Screenshot {
  id?: string;
  image_id: string;
}

export interface AgeRating {
  organization: number;
  rating_category: number;
}

export interface Language {
  name: string;
}

export interface LangSupportType {
  name: string;
}

export interface LanguageSupport {
  language: Language;
  language_support_type: LangSupportType;
}

/** All time values are in hours, sourced from HowLongToBeat via IGDB. */
export interface GameTimeToBeat {
  hastily?: number;
  normally?: number;
  completely?: number;
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface PcRequirements {
  minimum: SpecRow[];
  recommended: SpecRow[];
}

export interface LangRow {
  name: string;
  Audio: boolean;
  Subtitles: boolean;
  Interface: boolean;
}

export interface PlayTime {
  main: number | null;
  mainExtra: number | null;
  completionist: number | null;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

/** Brief game reference (id + name + optional cover). */
export interface GameBrief {
  id: number;
  name: string;
  cover?: Cover;
}

// Compatibility aliases for the same brief shape used across the codebase.
export type CollectionGame = GameBrief;
export type SimilarGame = GameBrief;
export type GamingEventGame = GameBrief;
export type GameItem = GameBrief;
export type GameCover = Cover;

/** Raw IGDB game shape. */
export interface GameData {
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
  collections?: { games?: GameBrief[] }[];
  similar_games?: GameBrief[];
}

/** Compact game card shape used by browse lists. */
export interface Game {
  id: number;
  name: string;
  cover?: Cover;
  total_rating?: number;
  first_release_date?: number;
  game_type?: number;
  platforms?: GamePlatform[];
  genres?: GameGenre[];
  hypes?: number;
  videos?: Video[];
  screenshots?: Screenshot[];
}

export interface GamePlatform {
  name: string;
  abbreviation?: string;
}

export interface GameGenre {
  name: string;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/** A free game offer (Epic / Steam giveaways). */
export interface FreeGame {
  id: string;
  title: string;
  image?: string | undefined;
  slug?: string | undefined;
  store?: string | undefined;
  url?: string | undefined;
  description?: string | undefined;
  type: string;
  startDate?: string | number | undefined;
  endDate?: string | number | undefined;
  igdb_game_id?: number | undefined;
}

/** A news article linked to a game. */
export interface NewsGame {
  id: string;
  name: string;
  image: string;
  apiUrl: string;
  source?: string;
}

/**
 * A news article / review item. The required fields are guaranteed by the
 * Appwrite `articles` collection schema.
 */
export interface Article {
  $id: string;
  title: string;
  category: string;
  siteName: string;
  pubDate: string;
  id?: string | number;
  description?: string;
  thumbnail?: string;
  language?: string;
  url?: string;
  link?: string;
}

// ---------------------------------------------------------------------------
// User library
// ---------------------------------------------------------------------------

/** A single row in a user's game library list. */
export interface GameEntry {
  id: string | number;
  name: string;
  cover_image_id?: string | null;
  release_date?: string;
  rating?: number;
}

export interface WeeklySummaryDoc {
  $id: string;
  $createdAt: string;
  summary_ar?: string;
  summary_en?: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface GamingEvent {
  id: number;
  name: string;
  event_logo?: { image_id: string };
  start_time: number;
  end_time: number;
  live_stream_url?: string;
  description?: string;
  games?: GamingEventGame[];
  videos?: GamingEventVideo[];
  event_networks?: GamingEventNetwork[];
}

export interface GamingEventVideo {
  name?: string;
  video_id: string;
}

export interface GamingEventNetwork {
  url: string;
  network_type: number;
}

// ---------------------------------------------------------------------------
// Chat / misc
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
}

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
