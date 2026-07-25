import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type GameEntry = {
  id: string | number;
  name: string;
  cover_image_id?: string | null;
  release_date?: string;
  rating?: number;
};
export type StackParamList = {
  UserGamesScreen: { listId: string; listName: string; ownerId?: string };
  GameDetails: { gameID: string | number };
  Games: undefined;
};
export type Props = NativeStackScreenProps<StackParamList, "UserGamesScreen">;

// GameItem
export type GameItemProps = {
  game: GameEntry;
  onRemove?: ((id: string | number, name: string) => void) | undefined;
  onRate?: ((id: string | number, rating: number) => void) | undefined;
};

export type ShimmerPlaceholderProps = {
  style?: object;
};
