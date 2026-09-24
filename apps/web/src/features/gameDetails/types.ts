import React from "react";

import type {
  GameData,
  PcRequirements,
  Website,
  CollectionGame,
  SimilarGame,
} from "@gaming-zone/core";
import type { User } from "firebase/auth";
import type { TranslateFn } from "@/i18n/translate";

export type {
  GameData,
  PcRequirements,
  Website,
  CollectionGame,
  SimilarGame,
} from "@gaming-zone/core";

export interface AgeRatingInfo {
  organization: number;
  rating_category: number;
}

export interface GameStoreInfo extends Website {
  name: string;
  logo: string;
  bg: string;
}

export interface GameDetailsClientProps {
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
  activeAgeRating: AgeRatingInfo | undefined;
  gameStores: GameStoreInfo[];
  coverUrl: string;
}

export interface GameHeroProps {
  t: TranslateFn;
  lang: string;
  game: GameData;
  coverUrl: string;
  rating: number;
  activeAgeRating: AgeRatingInfo | undefined;
  user: User | null;
  userRating: number;
  handleRateGame: (rating: number) => void;
  setListModalOpen: (open: boolean) => void;
}

export interface GameStoresGridProps {
  t: TranslateFn;
  lang: string;
  gameStores: GameStoreInfo[];
}

export interface GameAboutProps {
  t: TranslateFn;
  lang: string;
  summary?: string;
}

export interface GameScreenshotsProps {
  t: TranslateFn;
  lang: string;
  screenshots?: { image_id: string }[];
  activeScreenshotIdx: number | null;
  setActiveScreenshotIdx: (idx: number | null) => void;
  handleNextScreenshot: (e: React.MouseEvent) => void;
  handlePrevScreenshot: (e: React.MouseEvent) => void;
  zoomScale: number;
  setZoomScale: (scale: number) => void;
}

export interface GamePcRequirementsProps {
  t: TranslateFn;
  lang: string;
  pcSpecs: PcRequirements | null;
}

export interface GameLanguagesProps {
  t: TranslateFn;
  lang: string;
  languageRows: {
    name: string;
    Audio: boolean;
    Subtitles: boolean;
    Interface: boolean;
  }[];
}

export interface GameSeriesProps {
  t: TranslateFn;
  lang: string;
  seriesGames: CollectionGame[];
}

export interface GameSimilarProps {
  t: TranslateFn;
  lang: string;
  similarGames: SimilarGame[];
}

export interface GameSpecificationsProps {
  t: TranslateFn;
  lang: string;
  game: GameData;
}

export interface GamePlayTimeProps {
  t: TranslateFn;
  lang: string;
  playTime: {
    main: number | null;
    mainExtra: number | null;
    completionist: number | null;
  } | null;
}

export interface GameVideosProps {
  t: TranslateFn;
  lang: string;
  videos?: { name?: string; video_id: string }[];
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
}
