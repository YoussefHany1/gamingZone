import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  InteractionManager,
  ScrollView,
  ToastAndroid,
} from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import useCachedData from "@/src/hooks/useCachedData";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import type { GameData, LangRow, PcRequirements } from "../types";
import {
  fetchGameById,
  fetchSteamRequirements,
  extractSteamAppId,
  getAgeRatingInfo,
} from "../components/gameDetails/utils";

import type { UseGameDetailsProps } from "../types";

export const useGameDetails = ({
  initialGameID,
  navigation,
}: UseGameDetailsProps) => {
  const [currentId, setCurrentId] = useState<number | string>(initialGameID);
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef<boolean>(true);

  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null | undefined>(
    undefined,
  );
  const [showListModal, setShowListModal] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [rating, setRating] = useState<number>(0);
  const [pcRequirements, setPcRequirements] = useState<PcRequirements | null>(
    null,
  );
  const [pcReqLoading, setPcReqLoading] = useState<boolean>(false);

  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { onScroll } = useScrollDirection();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Data fetching
  const cacheKey = currentId ? `GAME_DETAILS_CACHE_${currentId}` : "";

  const fetchGameData = useCallback(async (): Promise<GameData> => {
    if (!currentId) throw new Error("No game ID provided");
    return fetchGameById(currentId);
  }, [currentId]);

  const {
    data: game,
    isLoading: loading,
    error,
  } = useCachedData<GameData>(cacheKey, fetchGameData, [currentId]);

  // Derived values
  const ageRating = useMemo(
    () => (game ? getAgeRatingInfo(game.age_ratings) : null),
    [game?.age_ratings],
  );

  const languageList: LangRow[] = useMemo(() => {
    if (!game?.language_supports) return [];
    const langMap: Record<string, LangRow> = {};
    game.language_supports.forEach((item) => {
      const langName = item.language.name;
      const supportType = item.language_support_type.name as keyof Omit<
        LangRow,
        "name"
      >;
      if (!langMap[langName]) {
        langMap[langName] = {
          name: langName,
          Audio: false,
          Subtitles: false,
          Interface: false,
        };
      }
      langMap[langName][supportType] = true;
    });
    return Object.values(langMap);
  }, [game?.language_supports]);

  const { main, mainExtra, completionist } = useMemo(() => {
    if (!game?.game_time_to_beats)
      return { main: null, mainExtra: null, completionist: null };
    const { hastily, normally, completely } = game.game_time_to_beats;
    return {
      main: hastily ? Math.floor(hastily / 3600) : null,
      mainExtra: normally ? Math.floor(normally / 3600) : null,
      completionist: completely ? Math.floor(completely / 3600) : null,
    };
  }, [game?.game_time_to_beats]);

  const gameDataForList = useMemo(() => {
    if (!game) return null;
    return {
      id: game.id,
      name: game.name,
      cover_image_id: game.cover?.image_id ?? null,
      release_date: game.release_dates?.[0]?.human ?? "N/A",
    };
  }, [game]);

  const handleRateGame = useCallback(
    async (newRating: number) => {
      if (!user || user.isAnonymous) {
        Alert.alert(t("common.error"), t("common.loginRequired"));
        return;
      }
      if (!game) return;

      const gameData = gameDataForList;
      if (!gameData) return;

      const ratingRef = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("ratings")
        .doc(String(currentId));

      const ratedGameRef = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("lists")
        .doc("rated")
        .collection("games")
        .doc(String(currentId));

      try {
        if (newRating === 0) {
          await ratingRef.delete();
          await ratedGameRef.delete();
        } else {
          await firestore()
            .collection("users")
            .doc(user.uid)
            .collection("lists")
            .doc("rated")
            .set(
              {
                name: "Rated",
                type: "default",
                createdAt: firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );

          await ratingRef.set({
            rating: newRating,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
          await ratedGameRef.set({
            ...gameData,
            rating: newRating,
            ratedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        // Sync with other lists
        const listsRef = firestore()
          .collection("users")
          .doc(user.uid)
          .collection("lists");
        const listsSnap = await listsRef.get();
        for (const listDoc of listsSnap.docs) {
          if (listDoc.id === "rated") continue;
          const gRef = listDoc.ref.collection("games").doc(String(currentId));
          const gSnap = await gRef.get();
          if (gSnap && gSnap.exists) {
            try {
              if (newRating === 0) {
                await gRef.update({ rating: firestore.FieldValue.delete() });
              } else {
                await gRef.update({ rating: newRating });
              }
            } catch (updateErr) {
              console.log(
                `[GameDetailsScreen] Stale cache update handled for list ${listDoc.id}`,
              );
            }
          }
        }
      } catch (e) {
        console.error("Error rating game:", e);
      }
    },
    [user, currentId, game, gameDataForList, t],
  );

  const seriesGames = useMemo(
    () => game?.collections?.[0]?.games ?? [],
    [game?.collections],
  );

  const similarGames = useMemo(
    () => game?.similar_games ?? [],
    [game?.similar_games],
  );

  // Effects
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setRating(0);
      return;
    }
    const ratingRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("ratings")
      .doc(String(currentId));

    const unsub = ratingRef.onSnapshot(
      (doc) => {
        if (doc && doc.exists) {
          setRating(doc.data()?.rating ?? 0);
        } else {
          setRating(0);
        }
      },
      (error) => {
        console.error("[GameDetailsScreen] Rating snapshot error:", error);
      },
    );

    return unsub;
  }, [user, currentId]);

  useEffect(() => {
    if (initialGameID && initialGameID !== currentId) {
      setCurrentId(initialGameID);
    }
  }, [initialGameID]);

  useEffect(() => {
    setPcRequirements(null);
    const appId = extractSteamAppId(game?.websites);
    if (!appId) return;
    let cancelled = false;
    setPcReqLoading(true);
    fetchSteamRequirements(appId).then((result) => {
      if (!cancelled) {
        setPcRequirements(result);
        setPcReqLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [game?.websites]);

  useEffect(() => {
    if (game && !loading) {
      setTimeout(() => {
        try {
          scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        } catch (_) {}
      }, 50);
    }
  }, [game, loading]);

  // Handlers
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
    [],
  );

  return {
    game,
    loading,
    error,
    isReady,
    currentId,
    currentLang,
    scrollRef,
    user,
    rating,
    showListModal,
    ageRating,
    languageList,
    pcRequirements,
    pcReqLoading,
    main,
    mainExtra,
    completionist,
    gameDataForList,
    seriesGames,
    similarGames,
    t,
    onScroll,
    handleRateGame,
    handleGoBack,
    handleAddToList,
    handleCloseModal,
    handleNavigateToGame,
  };
};
