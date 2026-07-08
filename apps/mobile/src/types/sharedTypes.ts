import {
  GamingEventGame,
  GamingEventNetwork,
  GamingEventVideo,
} from "../features/events/types";
import { GameCover, GameGenre, GamePlatform } from "../features/games/types";

export type CountdownResult = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type UserList = {
  id: string;
  name: string;
  isChecked: boolean;
};

export type PickerOption = {
  label: string;
  value: string;
};

export type GamingEvent = {
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
