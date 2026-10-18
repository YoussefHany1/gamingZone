/**
 * Prop types for the gameDetails component family.
 *
 * These live next to the components instead of the feature-level
 * `features/games/types.ts` to keep that file (data models + navigation +
 * hooks) from ballooning with component-only prop shapes.
 */
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import type {
  AgeRatingInfo,
  GameData,
  GameItem,
  LangRow,
  PcRequirements,
  StorePrice,
} from "../../types";

/** Trimmed game shape stored in a user's list entries (see `gameDataForList` in useGameDetails). */
export type GameListEntry = {
  id: number;
  name: string;
  cover_image_id: string | null;
  release_date: string;
};

export type GameDetailsHeaderProps = {
  onBack: () => void;
};

export type GameRatingSectionProps = {
  /** Auth user; the component hides itself for logged-out / anonymous users. */
  user: FirebaseAuthTypes.User | null;
  rating: number;
  onRate: (newRating: number) => Promise<void>;
};

export type GameDetailsContentProps = {
  game: GameData | null;
  loading: boolean;
  isReady: boolean;
  /** Needed only for `<ListSelectionModal gameId=… />`. */
  currentId: number | string;
  user: FirebaseAuthTypes.User | null;
  rating: number;
  ageRating: AgeRatingInfo | null;
  languageList: LangRow[];
  pcRequirements: PcRequirements | null;
  pcReqLoading: boolean;
  storePrices: StorePrice[] | null;
  storePricesLoading: boolean;
  main: number | null;
  mainExtra: number | null;
  completionist: number | null;
  gameDataForList: GameListEntry | null;
  seriesGames: GameItem[];
  similarGames: GameItem[];
  showListModal: boolean;
  claimUrl?: string | undefined;
  store?: string | undefined;
  isSubscribed: boolean;
  handleRateGame: (newRating: number) => Promise<void>;
  handleAddToList: () => void;
  handleCloseModal: () => void;
  handleNavigateToGame: (id: number) => void;
  onToggleNotification: () => Promise<void>;
};
