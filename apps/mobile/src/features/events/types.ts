import { GamingEvent } from "@/src/types/sharedTypes";

export type GamingEventGame = {
  id: number;
  name: string;
  cover?: { image_id: string };
};

export type GamingEventVideo = {
  name?: string;
  video_id: string;
};

export type GamingEventNetwork = {
  url: string;
  network_type: number;
};

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
