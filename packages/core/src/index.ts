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

// ---------------------------------------------------------------------------
// PC specifications + estimated compatibility
//
// The user picks their parts from a curated catalog (see
// `@gaming-zone/utils`); only the stable catalog ids are stored, so labels and
// relative scores can improve without a data migration.
// ---------------------------------------------------------------------------

/**
 * Target rendering resolution for compatibility estimates.
 *
 * Catalog scores are calibrated at 1080p; other resolutions scale the
 * comparison (see `RESOLUTION_FACTORS` in `@gaming-zone/utils`).
 */
export type PcResolution = "1080p" | "1440p" | "4k";

/** Overall capability bracket derived from the machine's estimated score. */
export type PcGamingTier = "entry" | "mainstream" | "performance" | "enthusiast";

/** Estimated quality at 1080p. `unsupported` means the PC is below the minimum. */
export type PcQuality = "unsupported" | "low" | "medium" | "high" | "ultra";

export type PcPartKey = "cpu" | "gpu" | "ram" | "storage";

export interface PcSpecs {
  cpuId: string;
  gpuId: string;
  ramGb: number;
  freeStorageGb: number;
  /** Defaults to "1080p" when absent (older persisted copies). */
  resolution?: PcResolution;
  /** Unix milliseconds; lets clients replace older local copies deterministically. */
  updatedAt: number;
}

/**
 * One relative-performance entry of the hardware catalog.
 *
 * `score` is a hand-curated 0–100 "1080p capability" index — comparable
 * between CPUs and GPUs, but not a benchmark and not an FPS prediction.
 */
export interface PcCpu {
  id: string;
  label: string;
  score: number;
  /** Regex source matched against Steam's requirement text (case-insensitive). */
  match: string;
  /** Groups VRAM/clock variants of the same model line (e.g. "rtx-3060"). */
  family?: string;
  /** Extra search terms for the picker, beyond the label. */
  aliases?: readonly string[];
}

export interface PcGpu extends PcCpu {
  vramGb?: number;
}

/** How one part compares against Steam's requirement text. */
export interface PcPartVerdict {
  /** Steam's requirement value ("GTX 1060 6GB"), or null when not listed. */
  required: string | null;
  /** The user's part as displayed ("RTX 3060 12GB"). */
  actual: string;
  status: "meets" | "below" | "unknown";
}

export interface PcCompatibility {
  quality: PcQuality;
  parts: Record<PcPartKey, PcPartVerdict>;
  /** The quality-limiting part, or null when no part is below its requirement. */
  bottleneck: PcPartKey | null;
  /** True when at least one requirement was inferred rather than catalog-exact. */
  approximate: boolean;
  /** The resolution the estimate was made for; "1080p" for legacy data. */
  resolution: PcResolution;
}

/** Overall machine capability from `estimatePcScore` (`@gaming-zone/utils`). */
export interface PcScoreSummary {
  /** 0–100 index: `gpu * 0.65 + cpu * 0.35`, rounded. */
  score: number;
  tier: PcGamingTier;
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
  /**
   * IGDB category id. 0 is a base game; anything else is a DLC, expansion,
   * bundle or pack. Rails that should only show playable base games filter on
   * this rather than casting the game to `any`.
   */
  category?: number;
  platforms?: GamePlatform[];
  genres?: GameGenre[];
  hypes?: number;
  videos?: Video[];
  screenshots?: Screenshot[];
  /**
   * Populated by the batched ids endpoint, which the recommendation engine uses
   * to walk from the games a user plays to games they might like.
   */
  similar_games?: GameBrief[];
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
 * Languages the app's UI supports. AI article summaries are generated and
 * stored for every one of these (article *content* is still only `ar`/`en`).
 */
export type SummaryLanguage = "en" | "ar" | "es" | "fr" | "hi" | "pt-BR" | "pt-PT";

/**
 * Appwrite attribute names on the `articles` collection that hold the
 * per-language AI summary. Lowercased to avoid mixed-case key surprises; the
 * `pt-BR`/`pt-PT` variants use underscores since attribute names cannot contain
 * a hyphen.
 */
export type ArticleSummaryKey =
  | "summary_en"
  | "summary_ar"
  | "summary_es"
  | "summary_fr"
  | "summary_hi"
  | "summary_pt_br"
  | "summary_pt_pt";

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
  /** AI-generated, ≤3-line summaries (one per supported language). */
  summary_en?: string;
  summary_ar?: string;
  summary_es?: string;
  summary_fr?: string;
  summary_hi?: string;
  summary_pt_br?: string;
  summary_pt_pt?: string;
  /**
   * Set once a document's summaries have all been generated. `summaries_failed`
   * marks documents that exhausted their retry budget (distinct from success).
   */
  summaries_at?: string;
  summaries_attempts?: number;
  summaries_failed?: boolean;
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

// ---------------------------------------------------------------------------
// Gamification
// ---------------------------------------------------------------------------

/**
 * Where a chunk of XP came from.
 *
 * These are *activity* reasons only. Achievement bonuses are tracked
 * separately (`XpBreakdownEntry.reason === "achievement"`) because they are
 * granted once per unlocked badge rather than per unit of activity.
 */
export type XpReason =
  | "first_rating"
  | "five_star_rating"
  | "game_played"
  | "game_tracked";

/** Badge rarity. Purely cosmetic ordering — no gameplay effect. */
export type AchievementTier = "bronze" | "silver" | "gold";

/**
 * The raw counters an achievement is measured against.
 *
 * Every entry is a plain count taken from the user's own data. No criterion
 * depends on the level or on XP, which keeps the derivation a single
 * acyclic pass: counts → XP → level → achievements.
 */
export type AchievementMetric =
  | "ratedCount"
  | "fiveStarCount"
  | "playedCount"
  | "trackedCount"
  | "playtimeHours";

/** A badge definition. The catalog lives in `@gaming-zone/utils`. */
export interface AchievementDefinition {
  id: string;
  tier: AchievementTier;
  /**
   * Icon key, resolved to a real icon by the app (the shared package cannot
   * know about React Native icon libraries).
   */
  icon: string;
  /** Which counter the badge watches. */
  metric: AchievementMetric;
  /** Value of `metric` required to unlock. */
  target: number;
  /** Flat XP granted once, when the badge unlocks. */
  xp: number;
}

/** The raw counters the gamification rules are computed from. */
export interface GamificationStats {
  /** Games the user has rated at least once. */
  ratedCount: number;
  /** Ratings the user gave five stars. */
  fiveStarCount: number;
  /** Games in the "played" list. */
  playedCount: number;
  /** Games tracked in the user's own lists (the auto-mirrored "rated" list excluded). */
  trackedCount: number;
  /** Total logged playtime in hours. */
  playtimeHours: number;
}

/** A badge in its current state — unlocked or still being worked towards. */
export interface AchievementState {
  id: string;
  tier: AchievementTier;
  icon: string;
  unlocked: boolean;
  /** Current value of the watched metric. */
  current: number;
  /** Value required to unlock. */
  target: number;
  /** Flat XP the badge grants on unlock. */
  xp: number;
}

/** One line of the "where did my XP come from" breakdown. */
export interface XpBreakdownEntry {
  reason: XpReason | "achievement" | "retained";
  /** i18n key for the line label. */
  labelKey: string;
  /** XP contributed by this line. */
  amount: number;
}

/** The full gamification state for a user. */
export interface GamificationState {
  /** Monotonic XP high-water mark — never decreases. */
  totalXp: number;
  level: number;
  /** XP earned since the current level started. */
  xpIntoLevel: number;
  /** XP required to reach the next level. */
  xpToNextLevel: number;
  /** Progress through the current level, 0..1. */
  levelProgress: number;
  /** XP the raw counters currently account for (may be below `totalXp`). */
  calculatedXp: number;
  achievements: AchievementState[];
  breakdown: XpBreakdownEntry[];
}
