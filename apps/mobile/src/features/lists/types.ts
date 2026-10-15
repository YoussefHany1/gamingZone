import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GameEntry } from "@gaming-zone/core";

export type { GameEntry } from "@gaming-zone/core";

export type ListType = "default" | "custom";

/** Document stored at `users/{uid}/lists/{listId}`. */
export type UserList = {
  id: string;
  name: string;
  description?: string;
  type?: ListType;
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

export type ShimmerPlaceholderProps = {
  style?: object;
};
