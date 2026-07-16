import React from "react";

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

export interface CollectionGame {
  id: number;
  name: string;
  cover?: { image_id: string };
}

export interface SimilarGame {
  id: number;
  name: string;
  cover?: { image_id: string };
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface PcRequirements {
  minimum: SpecRow[];
  recommended: SpecRow[];
}

export interface GameData {
  id: number;
  name: string;
  summary?: string;
  cover?: { image_id: string };
  total_rating?: number;
  total_rating_count?: number;
  release_dates?: { human?: string }[];
  platforms?: { id: number; name: string; abbreviation?: string }[];
  genres?: { id: number; name: string }[];
  game_modes?: { id: number; name: string }[];
  age_ratings?: { organization: number; rating_category: number }[];
  involved_companies?: InvolvedCompany[];
  game_engines?: { id: number; name: string }[];
  videos?: { name?: string; video_id: string }[];
  screenshots?: { image_id: string }[];
  language_supports?: {
    language: { name: string };
    language_support_type: { name: string };
  }[];
  game_time_to_beats?: {
    hastily?: number;
    normally?: number;
    completely?: number;
  };
  websites?: Website[];
  collections?: { games?: CollectionGame[] }[];
  similar_games?: SimilarGame[];
}

export interface GameDetailsClientProps {
  t?: any;
  lang?: string;
  game: GameData;
  pcSpecs: PcRequirements | null;
  rating: number;
  playTime: {
    main: number | null;
    mainExtra: number | null;
    completionist: number | null;
  } | null;
  languageRows: {
    name: string;
    Audio: boolean;
    Subtitles: boolean;
    Interface: boolean;
  }[];
  activeAgeRating:
    | { organization: number; rating_category: number }
    | undefined;
  gameStores: any[];
  coverUrl: string;
}

export interface GameHeroProps {
  t?: any;
  lang?: string;
  game: GameData;
  coverUrl: string;
  rating: number;
  activeAgeRating: { organization: number; rating_category: number } | undefined;
  user: any;
  userRating: number;
  handleRateGame: (rating: number) => void;
  setListModalOpen: (open: boolean) => void;
}

export interface GameStoresGridProps {
  t?: any;
  lang?: string;
  gameStores: any[];
}

export interface GameAboutProps {
  t?: any;
  lang?: string;
  summary?: string;
}

export interface GameScreenshotsProps {
  t?: any;
  lang?: string;
  screenshots?: { image_id: string }[];
  activeScreenshotIdx: number | null;
  setActiveScreenshotIdx: (idx: number | null) => void;
  handleNextScreenshot: (e: React.MouseEvent) => void;
  handlePrevScreenshot: (e: React.MouseEvent) => void;
  zoomScale: number;
  setZoomScale: (scale: number) => void;
}

export interface GamePcRequirementsProps {
  t?: any;
  lang?: string;
  pcSpecs: PcRequirements | null;
}

export interface GameLanguagesProps {
  t?: any;
  lang?: string;
  languageRows: {
    name: string;
    Audio: boolean;
    Subtitles: boolean;
    Interface: boolean;
  }[];
}

export interface GameSeriesProps {
  t?: any;
  lang?: string;
  seriesGames: any[];
}

export interface GameSimilarProps {
  t?: any;
  lang?: string;
  similarGames: any[];
}

export interface GameSpecificationsProps {
  t?: any;
  lang?: string;
  game: GameData;
}

export interface GamePlayTimeProps {
  t?: any;
  lang?: string;
  playTime: {
    main: number | null;
    mainExtra: number | null;
    completionist: number | null;
  } | null;
}

export interface GameVideosProps {
  t?: any;
  lang?: string;
  videos?: { name?: string; video_id: string }[];
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
}
