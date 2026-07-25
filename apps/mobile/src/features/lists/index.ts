/**
 * Barrel export for the `lists` feature.
 *
 * @example
 * import { UserListsScreen, type GameEntry } from '@/src/features/lists';
 */

// ── Screens ───────────────────────────────────────────────────────────────────
export { default as UserListsScreen } from "./screens/UserListsScreen";
export { default as UserGamesScreen } from "./screens/UserGamesScreen";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  GameEntry,
  StackParamList,
  Props,
  GameItemProps,
  ShimmerPlaceholderProps,
} from "./types";
