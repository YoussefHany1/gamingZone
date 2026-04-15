// Shared Domain Types

export interface RssFeedSource {
  name: string;
  image: string | { uri: string };
  language: "ar" | "en";
  website?: string;
  aboutSite?: string;
}

export interface Article {
  $id?: string;
  id?: string | number;
  title: string;
  description?: string;
  pubDate?: string;
  thumbnail?: string;
  language?: string;
  siteName?: string;
  url?: string;
}

export interface GameCover {
  image_id: string;
}

export interface GamePlatform {
  name: string;
  abbreviation?: string;
}

export interface GameGenre {
  name: string;
}

export interface Game {
  id: number;
  name: string;
  cover?: GameCover;
  total_rating?: number;
  game_type?: number;
  first_release_date?: number;
  platforms?: GamePlatform[];
  genres?: GameGenre[];
  hypes?: number;
}

export interface FreeGame {
  id: string;
  title: string;
  image?: string;
  slug?: string;
  store?: "steam" | "epic" | string;
  url?: string;
  description?: string;
  type: "current" | "next" | string;
  startDate?: string | number;
  endDate?: string | number;
  igdb_game_id?: number;
}

export interface GamingEventGame {
  id: number;
  name: string;
  cover?: { image_id: string };
}

export interface GamingEventVideo {
  name?: string;
  video_id: string;
}

export interface GamingEventNetwork {
  url: string;
  network_type: number; // 1=Twitter, 2=Instagram, 3=YouTube, 4=Twitch, 5=Discord, 6=Facebook, 7=Website
}

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

export interface UserList {
  id: string;
  name: string;
  isChecked: boolean;
}

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface PickerOption {
  label: string;
  value: string;
}

export interface WeeklySummaryDoc {
  $id: string;
  $createdAt: string;
  summary_ar?: string;
  summary_en?: string;
}