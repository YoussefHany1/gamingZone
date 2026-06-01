import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ToastAndroid,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import ImageGallerySkeleton from "../skeleton/gameDetails/ImageGallerySkeleton";
import GameDetailsMetaSkeleton from "../skeleton/gameDetails/GameDetailsMetaSkeleton";
import GameStoresSkeleton from "../skeleton/gameDetails/GameStoresSkeleton";
import GameAboutSkeleton from "../skeleton/gameDetails/GameAboutSkeleton";
import GameTrailerSkeleton from "../skeleton/gameDetails/GameTrailerSkeleton";
import GameDetailsGridSkeleton from "../skeleton/gameDetails/GameDetailsGridSkeleton";
import GameLanguageTableSkeleton from "../skeleton/gameDetails/GameLanguageTableSkeleton";
import GameHowLongToBeatSkeleton from "../skeleton/gameDetails/GameHowLongToBeatSkeleton";
import GameHorizontalScrollSkeleton from "../skeleton/gameDetails/GameHorizontalScrollSkeleton";
import ErrorState from "../components/ErrorState";
import ImageGallery from "../components/gameDetails/ImageGallery";
import ListSelectionModal from "../components/ListSelectionModal";
import useCachedData from "../hooks/useCachedData";
import { adUnitId } from "../constants/config";
import COLORS from "../constants/colors";

// gameDetails sub-components
import GameDetailsMeta from "../components/gameDetails/GameDetailsMeta";
import GameStores from "../components/gameDetails/GameStores";
import GameActionButtons from "../components/gameDetails/GameActionButtons";
import GameAbout from "../components/gameDetails/GameAbout";
import GameTrailer from "../components/gameDetails/GameTrailer";
import GameDetailsGrid from "../components/gameDetails/GameDetailsGrid";
import GameLanguageTable from "../components/gameDetails/GameLanguageTable";
import GameHowLongToBeat from "../components/gameDetails/GameHowLongToBeat";
import GamePcRequirements from "../components/gameDetails/GamePcRequirements";
import GameHorizontalScroll from "../components/gameDetails/GameHorizontalScroll";
import GameDetailsBackground from "../components/gameDetails/GameDetailsBackground";

// shared types & utils
import type {
  GamesStackParamList,
  GameData,
  LangRow,
  PcRequirements,
} from "../components/gameDetails/types";
// Re-export so existing consumers (e.g. GamesList.tsx) keep working
export type { GamesStackParamList };
import {
  fetchGameById,
  fetchSteamRequirements,
  extractSteamAppId,
  getAgeRatingInfo,
} from "../components/gameDetails/utils";

type Props = NativeStackScreenProps<GamesStackParamList, "GameDetails">;

const GameDetails: React.FC<Props> = ({ route, navigation }) => {
  const { gameID: initialGameID, claimUrl, store = "" } = route.params;
  const [currentId, setCurrentId] = useState<number | string>(initialGameID);
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef<boolean>(true);

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

  const getGameDataForList = useCallback(() => {
    if (!game) return null;
    return {
      id: game.id,
      name: game.name,
      cover_image_id: game.cover?.image_id ?? null,
      release_date: game.release_dates?.[0]?.human ?? "N/A",
    };
  }, [game]);

  const handleRateGame = useCallback(async (newRating: number) => {
    if (!user || user.isAnonymous) {
      Alert.alert(t("common.error"), t("common.loginRequired"));
      return;
    }
    if (!game) return;

    const gameData = getGameDataForList();
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
          .set({
            name: "Rated",
            type: "default",
            createdAt: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

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
            console.log(`[GameDetailsScreen] Stale cache update handled for list ${listDoc.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error rating game:", e);
    }
  }, [user, currentId, game, getGameDataForList, t]);

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
      }
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

  return (
    <SafeAreaView edges={["right", "left"]} style={styles.container}>
      {/* Back button — always visible */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Error states */}
      {!loading && error && <ErrorState message={`Error: ${String(error)}`} />}
      {!loading && !error && !game && (
        <ErrorState message="No data to display" showContactButton={false} />
      )}

      {/* Main content — ScrollView always mounted, each section swaps independently */}
      {(loading || game) && (
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover / Screenshots Gallery */}
          <View style={{ zIndex: 100 }}>
            {loading ? (
              <ImageGallerySkeleton />
            ) : (
              <ImageGallery
                coverImageId={game!.cover?.image_id}
                screenshots={game!.screenshots ?? []}
              />
            )}
          </View>

          {/* Blurred background — only once image data is ready */}
          {!loading && game && (
            <GameDetailsBackground
              coverImageId={game.cover?.image_id}
              currentLang={currentLang}
            />
          )}

          <View style={styles.content}>
            {/* Title, platforms, rating, age rating */}
            {loading ? (
              <GameDetailsMetaSkeleton />
            ) : game ? (
              <GameDetailsMeta
                name={game.name}
                releaseDate={game.first_release_date}
                platforms={game.platforms}
                totalRating={game.total_rating}
                totalRatingCount={game.total_rating_count}
                ageRating={ageRating}
              />
            ) : null}

            {/* Stores */}
            {loading ? (
              <GameStoresSkeleton />
            ) : game ? (
              <GameStores websites={game.websites} />
            ) : null}

            {/* Action buttons — static (route params), always shown */}
            <GameActionButtons
              claimUrl={claimUrl}
              store={store}
              onAddToList={handleAddToList}
            />

            {/* Rating Section */}
            {user && !user.isAnonymous && game && (
              <View style={styles.ratingSection}>
                <Text style={styles.ratingTitle}>
                  {t("games.details.rateThisGame") ?? "Rate this Game"}
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleRateGame(rating === star ? 0 : star)}
                      activeOpacity={0.7}
                      style={{ paddingHorizontal: 6 }}
                    >
                      <Ionicons
                        name={star <= rating ? "star" : "star-outline"}
                        size={32}
                        color={star <= rating ? "#ffc107" : COLORS.lightGray}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {rating > 0 && (
                  <Text style={styles.ratingValueText}>
                    {t("games.details.yourRating") ?? "Your Rating"}: {rating} / 5
                  </Text>
                )}
              </View>
            )}

            <ListSelectionModal
              visible={showListModal}
              onClose={handleCloseModal}
              gameId={currentId}
              gameData={getGameDataForList()}
            />

            {/* About */}
            {loading ? (
              <GameAboutSkeleton />
            ) : game ? (
              <GameAbout summary={game.summary} />
            ) : null}

            {/* Trailer */}
            {loading ? (
              <GameTrailerSkeleton />
            ) : game ? (
              <GameTrailer videos={game.videos} />
            ) : null}

            {/* Details grid */}
            {loading ? (
              <GameDetailsGridSkeleton />
            ) : game ? (
              <GameDetailsGrid
                genres={game.genres}
                gameModes={game.game_modes}
                involvedCompanies={game.involved_companies}
                gameEngines={game.game_engines}
              />
            ) : null}

            {/* Ad — always shown */}
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
              />
            </View>

            {/* Language support table */}
            {loading ? (
              <GameLanguageTableSkeleton />
            ) : game ? (
              <GameLanguageTable languageList={languageList} />
            ) : null}

            {/* How long to beat */}
            {loading ? (
              <GameHowLongToBeatSkeleton />
            ) : game ? (
              <GameHowLongToBeat
                main={main}
                mainExtra={mainExtra}
                completionist={completionist}
              />
            ) : null}

            {/* Second ad — always shown */}
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
              />
            </View>

            {/* PC System Requirements — has its own internal skeleton via pcReqLoading */}
            <GamePcRequirements
              pcRequirements={pcRequirements}
              pcReqLoading={pcReqLoading}
            />

            {/* Game series */}
            {loading ? (
              <GameHorizontalScrollSkeleton title={t("games.details.series")} />
            ) : (
              <GameHorizontalScroll
                title={t("games.details.series")}
                games={seriesGames}
                onGamePress={handleNavigateToGame}
              />
            )}

            {/* Similar games */}
            {loading ? (
              <GameHorizontalScrollSkeleton
                title={t("games.details.similar")}
              />
            ) : (
              <GameHorizontalScroll
                title={t("games.details.similar")}
                games={similarGames}
                onGamePress={handleNavigateToGame}
              />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default GameDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    position: "absolute",
    width: 40,
    height: 40,
    top: 50,
    left: 10,
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + "90",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    padding: 20,
    backgroundColor: COLORS.primary,
  },
  errorText: { color: "red", textAlign: "center" },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
  ratingSection: {
    backgroundColor: "rgba(119, 155, 221, 0.08)",
    borderRadius: 16,
    padding: 20,
    marginVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(119, 155, 221, 0.15)",
  },
  ratingTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  ratingValueText: {
    color: COLORS.lightGray,
    fontSize: 14,
    fontWeight: "600",
  },
});
