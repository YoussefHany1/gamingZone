import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastAndroid } from "react-native";
import type { RefObject } from "react";
import type { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useShallow } from "zustand/react/shallow";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import type { UseScrollDirectionResult } from "@/src/hooks/useScrollDirection";
import { useAuthStore } from "@/src/store/useAuthStore";
import { formatLanguageRows, formatPlayTime } from "@gaming-zone/utils";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { getAgeRatingInfo } from "../components/gameDetails/utils";
import type { GameListEntry } from "../components/gameDetails/types";
import type {
  AgeRatingInfo,
  GameData,
  GameItem,
  LangRow,
  PcRequirements,
  StorePrice,
  UseGameDetailsProps,
} from "../types";
import { useCurrentGameId } from "./useCurrentGameId";
import { useGameContentReady } from "./useGameContentReady";
import { useGameData } from "./useGameData";
import { useGamePcRequirements } from "./useGamePcRequirements";
import { useGameRating } from "./useGameRating";
import { useGameStorePrices } from "./useGameStorePrices";

/** Everything the game details screen renders. */
export type GameDetailsView = {
  game: GameData | null;
  loading: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
  isReady: boolean;
  currentId: number | string;
  currentLang: string;
  scrollRef: RefObject<ScrollView | null>;
  user: FirebaseAuthTypes.User | null;
  rating: number;
  showListModal: boolean;
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
  t: TFunction;
  onScroll: UseScrollDirectionResult["onScroll"];
  handleRateGame: (newRating: number) => Promise<void>;
  handleGoBack: () => void;
  handleAddToList: () => void;
  handleCloseModal: () => void;
  handleNavigateToGame: (id: number) => void;
};

/**
 * Owns what the game details screen needs: the loaded IGDB payload, the values
 * derived from it, the user's rating, the Steam/PC-store lookups, and the
 * screen's own interactions (list modal, back navigation, switching games in
 * place).
 *
 * Each of those is a single-purpose hook in this folder; all this hook does is
 * wire them together and turn `game` into the view model the section components
 * take.
 */
export const useGameDetails = ({
  initialGameID,
  navigation,
}: UseGameDetailsProps): GameDetailsView => {
  const { currentId, setCurrentId } = useCurrentGameId(initialGameID);
  const isReady = useGameContentReady(initialGameID);
  const scrollRef = useRef<ScrollView>(null);
  const { onScroll } = useScrollDirection();
  const { t, i18n } = useTranslation();
  const user = useAuthStore(useShallow((s) => s.user));

  const { game, loading, error, refetch } = useGameData(currentId);

  // ── Derived from the loaded game ─────────────────────────────────────────
  const ageRating = useMemo(
    () => getAgeRatingInfo(game?.age_ratings),
    [game?.age_ratings],
  );

  const languageList: LangRow[] = useMemo(
    () => formatLanguageRows(game?.language_supports),
    [game?.language_supports],
  );

  const { main, mainExtra, completionist } = useMemo(
    () =>
      formatPlayTime(game?.game_time_to_beats) ?? {
        main: null,
        mainExtra: null,
        completionist: null,
      },
    [game?.game_time_to_beats],
  );

  /**
   * The compact entry written into a user's list when they rate the game. Lists
   * store a snapshot, not the full IGDB payload.
   */
  const gameDataForList = useMemo<GameListEntry | null>(() => {
    if (!game) return null;
    return {
      id: game.id,
      name: game.name,
      cover_image_id: game.cover?.image_id ?? null,
      release_date: game.release_dates?.[0]?.human ?? "N/A",
    };
  }, [game]);

  const seriesGames = useMemo(
    () => game?.collections?.[0]?.games ?? [],
    [game?.collections],
  );

  const similarGames = useMemo(
    () => game?.similar_games ?? [],
    [game?.similar_games],
  );

  // ── Loaded independently of the main payload ─────────────────────────────
  const { rating, rateGame } = useGameRating(currentId, gameDataForList);
  const { pcRequirements, pcReqLoading } = useGamePcRequirements(game?.websites);
  const { storePrices, storePricesLoading } = useGameStorePrices(
    game?.name,
    game?.websites,
  );

  // ── Screen interactions ──────────────────────────────────────────────────
  const [showListModal, setShowListModal] = useState<boolean>(false);

  // Opening the screen — or switching game in place — starts at the top.
  useEffect(() => {
    if (game && !loading) {
      setTimeout(() => {
        try {
          scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        } catch (_e) {
          // scroll may fail if the ref is unmounted — safe to ignore
        }
      }, 50);
    }
  }, [game, loading]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAddToList = useCallback(() => {
    if (!user) {
      ToastAndroid.show(
        t("common.loginRequired") ?? "You need to log in.",
        ToastAndroid.LONG,
      );
      return;
    }
    setShowListModal(true);
  }, [user, t]);

  const handleCloseModal = useCallback(() => setShowListModal(false), []);

  const handleNavigateToGame = useCallback(
    (id: number) => setCurrentId(id),
    [setCurrentId],
  );

  return {
    game,
    loading,
    error,
    refetch,
    isReady,
    currentId,
    currentLang: i18n.language,
    scrollRef,
    user,
    rating,
    showListModal,
    ageRating,
    languageList,
    pcRequirements,
    pcReqLoading,
    storePrices,
    storePricesLoading,
    main,
    mainExtra,
    completionist,
    gameDataForList,
    seriesGames,
    similarGames,
    t,
    onScroll,
    handleRateGame: rateGame,
    handleGoBack,
    handleAddToList,
    handleCloseModal,
    handleNavigateToGame,
  };
};
