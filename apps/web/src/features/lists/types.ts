export interface GameList {
  id: string;
  name: string;
  type: "default" | "custom";
  createdAt?: any;
}

export interface GameEntry {
  id: string | number;
  name: string;
  cover_image_id?: string | null;
  release_date?: string;
  rating?: number;
}

export const DEFAULT_LISTS = [
  { id: "played", name: "Played", type: "default" as const },
  { id: "wantToPlay", name: "Want to Play", type: "default" as const },
  { id: "playing", name: "Playing", type: "default" as const },
  { id: "rated", name: "Rated", type: "default" as const },
];
