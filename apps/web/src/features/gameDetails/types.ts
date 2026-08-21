import React from "react";

import type { GameData, PcRequirements } from "@gaming-zone/core";

export type {
  GameData,
  PcRequirements,
  Website,
  Company,
  InvolvedCompany,
  CollectionGame,
  SimilarGame,
  SpecRow,
} from "@gaming-zone/core";

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
