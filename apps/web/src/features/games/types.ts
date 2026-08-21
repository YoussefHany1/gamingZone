import React from "react";

import type { FreeGame, Game, NewsGame } from "@gaming-zone/core";

export type { FreeGame, Game, NewsGame } from "@gaming-zone/core";

export interface FreeGamesRowProps {
  games: FreeGame[];
}

export interface FreeGameCountdownProps {
  timestamp: string | number;
}

export interface GameCountdownProps {
  timestamp: number;
}

export interface GameRowProps {
  title: string;
  icon: React.ReactNode;
  games: Game[];
  showCountdown?: boolean;
}

export interface NewsRowProps {
  title: string;
  icon: React.ReactNode;
}
