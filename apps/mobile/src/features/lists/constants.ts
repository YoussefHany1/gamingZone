import type { ListType } from "./types";

/** The four built-in lists every user gets, in display order. */
export const DEFAULT_LIST_IDS: readonly string[] = [
  "played",
  "wantToPlay",
  "playing",
  "rated",
];

/** Seed metadata for the built-in lists (written once by `useUserLists`). */
export const DEFAULT_LISTS: { id: string; name: string; type: ListType }[] = [
  { id: "played", name: "Played", type: "default" },
  { id: "wantToPlay", name: "Want to Play", type: "default" },
  { id: "playing", name: "Playing", type: "default" },
  { id: "rated", name: "Rated", type: "default" },
];

/** Number of games shown between inline ad slots. */
export const AD_INTERVAL = 4;

/** Storage key that remembers the user's preferred list display mode. */
export const VIEW_MODE_KEY = "user_games_view_mode";

/**
 * Cell gutter for a grid item (whether a game poster or an ad box). FlashList
 * fixes each cell's width from the column count, so the gutter lives on a
 * wrapper view; the ad box reuses this so it lines up with the surrounding
 * posters in the wall.
 */
export const POSTER_CELL_STYLE = { paddingHorizontal: 4, marginBottom: 16 };
