export interface EventCountdownProps {
  startTime: number;
}

export interface Video {
  video_id: string;
  name: string;
}

export interface Game {
  id: number;
  name: string;
  cover?: { image_id: string };
}

export interface EventStreamButtonProps {
  url: string;
  status: "live" | "upcoming" | "ended";
}
