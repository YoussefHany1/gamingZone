import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import ImageGallerySkeleton from "../skeleton/gameDetails/ImageGallerySkeleton";
import GameDetailsMetaSkeleton from "../skeleton/gameDetails/GameDetailsMetaSkeleton";
import GameStoresSkeleton from "../skeleton/gameDetails/GameStoresSkeleton";
import GameAboutSkeleton from "../skeleton/gameDetails/GameAboutSkeleton";
import GameTrailerSkeleton from "../skeleton/gameDetails/GameTrailerSkeleton";
import GameDetailsGridSkeleton from "../skeleton/gameDetails/GameDetailsGridSkeleton";
import GameLanguageTableSkeleton from "../skeleton/gameDetails/GameLanguageTableSkeleton";
import GameHowLongToBeatSkeleton from "../skeleton/gameDetails/GameHowLongToBeatSkeleton";
import GameHorizontalScrollSkeleton from "../skeleton/gameDetails/GameHorizontalScrollSkeleton";
import ErrorState from "../../../components/ErrorState";
import ImageGallery from "../components/gameDetails/ImageGallery";
import ListSelectionModal from "../components/gameDetails/ListSelectionModal";
import { adUnitId } from "../../../constants/config";
import COLORS from "../../../constants/colors";
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
import type { GamesStackParamList, Props } from "../types";
export type { GamesStackParamList };
import { useGameDetails } from "../hooks/useGameDetails";

const GameDetails = ({ route, navigation }: Props) => {
  const { gameID: initialGameID, claimUrl, store = "" } = route.params;

  const {
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
  } = useGameDetails({ initialGameID, navigation });

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
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {!isReady ? (
            <View>
              <ImageGallerySkeleton />
              <View style={styles.content}>
                <GameDetailsMetaSkeleton />
                <GameStoresSkeleton />
                <GameAboutSkeleton />
              </View>
            </View>
          ) : (
            <>
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
                          onPress={() =>
                            handleRateGame(rating === star ? 0 : star)
                          }
                          activeOpacity={0.7}
                          style={{ paddingHorizontal: 6 }}
                        >
                          <Ionicons
                            name={star <= rating ? "star" : "star-outline"}
                            size={32}
                            color={
                              star <= rating ? "#ffc107" : COLORS.lightGray
                            }
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {rating > 0 && (
                      <Text style={styles.ratingValueText}>
                        {t("games.details.yourRating") ?? "Your Rating"}:{" "}
                        {rating} / 5
                      </Text>
                    )}
                  </View>
                )}

                <ListSelectionModal
                  visible={showListModal}
                  onClose={handleCloseModal}
                  gameId={currentId}
                  gameData={gameDataForList || undefined}
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
                  <GameHorizontalScrollSkeleton
                    title={t("games.details.series")}
                  />
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
            </>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
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
