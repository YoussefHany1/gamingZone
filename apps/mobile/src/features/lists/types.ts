import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GameEntry } from "@gaming-zone/core";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

export type { GameEntry } from "@gaming-zone/core";

export type ListType = "default" | "custom";

/** Document stored at `users/{uid}/lists/{listId}`. */
export type UserList = {
  id: string;
  name: string;
  description?: string;
  type?: ListType;
  /**
   * Server timestamp set when the list document is created. Kept as the real
   * Firestore `Timestamp` (not `Date`) so `UserListsScreen` can still call
   * `.toMillis()` when ordering custom lists.
   */
  createdAt?: FirebaseFirestoreTypes.Timestamp;
};

export type StackParamList = {
  UserGamesScreen: { listId: string; listName: string; ownerId?: string };
  GameDetails: { gameID: string | number };
  Games: undefined;
};
export type Props = NativeStackScreenProps<StackParamList, "UserGamesScreen">;

export type GameItemProps = {
  game: GameEntry;
  onRemove?: ((id: string | number, name: string) => void) | undefined;
  onRate?: ((id: string | number, rating: number) => void) | undefined;
};

/** The two ways a user's game list can be displayed. */
export type UserGamesViewMode = "list" | "grid";

export type GamePosterItemProps = {
  game: GameEntry;
  onRemove?: ((id: string | number, name: string) => void) | undefined;
};

/** Props for the list/grid segmented control in the games list header. */
export type ViewModeToggleProps = {
  value: UserGamesViewMode;
  onChange: (mode: UserGamesViewMode) => void;
};

/**
 * A single row of the games list: either a game or an inline ad slot. Modelling
 * ads as rows (rather than deriving them in `renderItem`) lets the same data
 * drive both view modes and lets an ad occupy a single grid cell.
 */
export type UserGamesRow =
  | { type: "game"; id: string; game: GameEntry }
  | { type: "ad"; id: string };

/** Props for the native ad slot interleaved in the games list. */
export type UserGamesNativeAdProps = {
  viewMode: UserGamesViewMode;
};

/** Props for the games-list empty state. */
export type EmptyGamesListProps = {
  listId: string;
  isSharedList: boolean;
  showSteamSync: boolean;
  onFindGame: () => void;
};

/** Props for the games-list header (title/description card + toolbar). */
export type GamesListHeaderProps = {
  /** Already-localized list title. */
  title: string;
  description: string;
  canEdit: boolean;
  isEditing: boolean;
  draftTitle: string;
  draftDescription: string;
  isSaving: boolean;
  isSharedList: boolean;
  showViewToggle: boolean;
  viewMode: UserGamesViewMode;
  onChangeDraftTitle: (value: string) => void;
  onChangeDraftDescription: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onChangeView: (mode: UserGamesViewMode) => void;
};

/** Props for the "create list" modal on the My Lists screen. */
export type CreateListModalProps = {
  visible: boolean;
  name: string;
  description: string;
  isCreating: boolean;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export type ShimmerPlaceholderProps = {
  style?: object;
};
