export type { GameEntry } from "@gaming-zone/core";

/** Minimal shape of the Firestore Timestamp values used for list ordering. */
export interface FirestoreTimestamp {
  toMillis: () => number;
}

export interface GameList {
  id: string;
  name: string;
  type: "default" | "custom";
  createdAt?: FirestoreTimestamp;
}

export const DEFAULT_LISTS = [
  { id: "played", name: "Played", type: "default" as const },
  { id: "wantToPlay", name: "Want to Play", type: "default" as const },
  { id: "playing", name: "Playing", type: "default" as const },
  { id: "rated", name: "Rated", type: "default" as const },
];
