import React from "react";

import type { FreeGame, Game } from "@gaming-zone/core";

export type { FreeGame, Game } from "@gaming-zone/core";

export interface FreeGamesRowProps {
  games: FreeGame[];
  title: string;
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
