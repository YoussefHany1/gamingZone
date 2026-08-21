import type {
  CountdownResult,
  GameCover,
  GameGenre,
  GamePlatform,
  GamingEvent,
  GamingEventVideo,
} from "@gaming-zone/core";

export type { CountdownResult, GamingEvent } from "@gaming-zone/core";

export type UserList = {
  id: string;
  name: string;
  isChecked: boolean;
};

export type PickerOption = {
  label: string;
  value: string;
};

export type Game = {
  screenshots: any;
  id: number;
  name: string;
  cover?: GameCover;
  total_rating?: number;
  game_type?: number;
  first_release_date?: number;
  platforms?: GamePlatform[];
  genres?: GameGenre[];
  hypes?: number;
  videos?: GamingEventVideo[];
};
