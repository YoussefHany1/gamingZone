import type { GameBrief, Video } from "@gaming-zone/core";

export type { GameBrief as Game, Video } from "@gaming-zone/core";

export interface EventCountdownProps {
  startTime: number;
}

export interface EventStreamButtonProps {
  url: string;
  status: "live" | "upcoming" | "ended";
}
