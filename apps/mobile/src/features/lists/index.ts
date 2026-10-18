/**
 * Barrel export for the `lists` feature.
 *
 * @example
 * import { UserListsScreen, type UserList } from '@/src/features/lists';
 */

// ── Screens ───────────────────────────────────────────────────────────────────
export { default as UserListsScreen } from "./screens/UserListsScreen";
export { default as UserGamesScreen } from "./screens/UserGamesScreen";

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useUserLists } from "./hooks/useUserLists";
export { useUserGames } from "./hooks/useUserGames";
export { useListEditing } from "./hooks/useListEditing";
export { useGameMutations } from "./hooks/useGameMutations";
export { useViewModePreference } from "./hooks/useViewModePreference";
export { useUserGamesRows } from "./hooks/useUserGamesRows";
export { useDeferredMount } from "./hooks/useDeferredMount";
export { useListDisplayName } from "./hooks/useListDisplayName";

// ── Constants ─────────────────────────────────────────────────────────────────
export { AD_INTERVAL, DEFAULT_LIST_IDS, DEFAULT_LISTS } from "./constants";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  GameEntry,
  ListType,
  UserList,
  StackParamList,
  Props,
  GameItemProps,
  GamePosterItemProps,
  UserGamesViewMode,
  UserGamesRow,
  ViewModeToggleProps,
  UserGamesNativeAdProps,
  EmptyGamesListProps,
  GamesListHeaderProps,
  CreateListModalProps,
  ShimmerPlaceholderProps,
} from "./types";
