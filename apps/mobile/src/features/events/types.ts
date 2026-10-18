import type { CountdownResult, GamingEvent } from "@/src/types/sharedTypes";
import type { EventStatus } from "@gaming-zone/utils";
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

// ── Event details sub-component props ──────────────────────────────────────────

export type EventStatusBadgeProps = {
  status: EventStatus;
};

export type EventHeroProps = {
  event: GamingEvent;
  status: EventStatus;
  /** Full-size hero image URL, or null to fall back to the placeholder. */
  logoUri: string | null;
  onBack: () => void;
};

export type EventDatesProps = {
  startDateStr: string;
  endDateStr: string;
};

export type EventCountdownProps = {
  timeUntil: CountdownResult;
};

export type EventStreamButtonProps = {
  status: EventStatus;
  onPress: () => void;
};

export type EventDescriptionProps = {
  description: string;
};

export type EventNetworksProps = {
  networks: GamingEventNetwork[];
};

export type EventVideosSectionProps = {
  videos: GamingEventVideo[];
};

export type EventFeaturedGamesSectionProps = {
  games: GamingEventGame[];
};
