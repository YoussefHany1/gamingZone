// ─── Navigation ────────────────────────────────────────────────────────────────

export type GamesStackParamList = {
  GameDetails: {
    gameID: number | string;
    claimUrl?: string;
    store?: string;
  };
};

// ─── IGDB raw shapes ───────────────────────────────────────────────────────────

export interface AgeRating {
  organization: number;
  rating_category: number;
}

export interface Platform { id: number; abbreviation?: string }
export interface Genre    { id: number; name: string }
export interface GameMode { id: number; name: string }
export interface Company  { id: number; name: string }
export interface Engine   { id: number; name: string }
export interface Video    { video_id?: string; name?: string }
export interface Screenshot { id?: string; image_id: string }
export interface Cover    { image_id?: string }
export interface Website  { id: number; type: number; url: string }
export interface Language { name: string }
export interface LangSupportType { name: string }

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

export interface InvolvedCompany {
  id: number;
  developer: boolean;
  publisher: boolean;
  company: Company;
}

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
  collections?: { games?: { id: number; name: string; cover?: Cover }[] }[];
  similar_games?: { id: number; name: string; cover?: Cover }[];
}

// ─── Derived / UI shapes ───────────────────────────────────────────────────────

export interface AgeRatingInfo { label: string; color: string }

export interface LangRow {
  name: string;
  Audio: boolean;
  Subtitles: boolean;
  Interface: boolean;
}

export interface SpecRow { label: string; value: string }

export interface PcRequirements {
  minimum: SpecRow[];
  recommended: SpecRow[];
}
