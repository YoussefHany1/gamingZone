import React from "react";

export interface FreeGame {
  id: string;
  title: string;
  image?: string;
  store?: string;
  url?: string;
  type: string;
  startDate?: string | number;
  endDate?: string | number;
}

export interface FreeGamesRowProps {
  games: FreeGame[];
}

export interface FreeGameCountdownProps {
  timestamp: string | number;
}

export interface GameCountdownProps {
  timestamp: number;
}

export interface Game {
  id: number;
  name: string;
  cover?: { image_id: string };
  total_rating?: number;
  first_release_date?: number;
  game_type?: number;
}

export interface GameRowProps {
  title: string;
  icon: React.ReactNode;
  games: Game[];
  showCountdown?: boolean;
}

export interface NewsGame {
  id: string;
  name: string;
  image: string;
  apiUrl: string;
  source?: string;
}

export interface NewsRowProps {
  title: string;
  icon: React.ReactNode;
}
