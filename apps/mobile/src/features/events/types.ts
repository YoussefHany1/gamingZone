import type { GamingEvent } from "@/src/types/sharedTypes";
import type {
  GamingEventGame,
  GamingEventNetwork,
  GamingEventVideo,
} from "@gaming-zone/core";

export type {
  GamingEventGame,
  GamingEventNetwork,
  GamingEventVideo,
} from "@gaming-zone/core";

export type EventDetailsParamList = {
  EventDetailsScreen: { event: GamingEvent };
};

export type VideoCardProps = {
  video: GamingEventVideo;
};

export type NetworkButtonProps = {
  network: GamingEventNetwork;
};

export type GameCardProps = {
  game: GamingEventGame;
};

export type CountdownBoxProps = {
  value: number;
  label: string;
};
