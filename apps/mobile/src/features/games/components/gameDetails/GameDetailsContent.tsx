import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import ImageGallerySkeleton from "../../skeleton/gameDetails/ImageGallerySkeleton";
import GameDetailsMetaSkeleton from "../../skeleton/gameDetails/GameDetailsMetaSkeleton";
import GameStoresSkeleton from "../../skeleton/gameDetails/GameStoresSkeleton";
import GameAboutSkeleton from "../../skeleton/gameDetails/GameAboutSkeleton";
import GameTrailerSkeleton from "../../skeleton/gameDetails/GameTrailerSkeleton";
import GameDetailsGridSkeleton from "../../skeleton/gameDetails/GameDetailsGridSkeleton";
import GameLanguageTableSkeleton from "../../skeleton/gameDetails/GameLanguageTableSkeleton";
import GameHowLongToBeatSkeleton from "../../skeleton/gameDetails/GameHowLongToBeatSkeleton";
import GameHorizontalScrollSkeleton from "../../skeleton/gameDetails/GameHorizontalScrollSkeleton";
import ImageGallery from "./ImageGallery";
import ListSelectionModal from "./ListSelectionModal";
import GameDetailsMeta from "./GameDetailsMeta";
import GameStores from "./GameStores";
import GameActionButtons from "./GameActionButtons";
import GameAbout from "./GameAbout";
import GameTrailer from "./GameTrailer";
import GameDetailsGrid from "./GameDetailsGrid";
import GameLanguageTable from "./GameLanguageTable";
import GameHowLongToBeat from "./GameHowLongToBeat";
import GamePcRequirements from "./GamePcRequirements";
import GameHorizontalScroll from "./GameHorizontalScroll";
import GameDetailsBackground from "./GameDetailsBackground";
import GameRatingSection from "./GameRatingSection";
import AdSlot from "@/src/components/AdSlot";
import { isUpcomingGame } from "./utils";
import type { GameDetailsContentProps } from "./types";

// Static layout styles — these do not depend on the active theme.
const styles = StyleSheet.create({
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  gallery: {
    zIndex: 100,
  },
});

/**
 * The scrollable body of the game details screen. Renders either the initial
 * skeleton (first cold load, before `isReady`) or the fully wired section list.
 * Each section swaps between its skeleton and its content independently.
 */
const GameDetailsContent: React.FC<GameDetailsContentProps> = ({
  game,
  loading,
  isReady,
  currentId,
  user,
  rating,
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
  showListModal,
  claimUrl,
  store,
  isSubscribed,
  handleRateGame,
  handleAddToList,
  handleCloseModal,
  handleNavigateToGame,
  onToggleNotification,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // First cold load — no cache, still deferring the full render.
  if (!isReady) {
    return (
      <View>
        <ImageGallerySkeleton />
        <View style={styles.content}>
          <GameDetailsMetaSkeleton />
          <GameStoresSkeleton />
          <GameAboutSkeleton />
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Cover / Screenshots Gallery */}
      <View style={styles.gallery}>
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
          <GameStores
            websites={game.websites}
            prices={storePrices ?? undefined}
            pricesLoading={storePricesLoading}
          />
        ) : null}

        {/* Action buttons — static (route params), always shown */}
        <GameActionButtons
          claimUrl={claimUrl}
          store={store}
          onAddToList={handleAddToList}
          isUpcoming={isUpcomingGame(game)}
          isSubscribed={isSubscribed}
          onToggleNotification={onToggleNotification}
        />

        {/* Rating Section */}
        {game && (
          <GameRatingSection user={user} rating={rating} onRate={handleRateGame} />
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
        <AdSlot marginVertical={20} />

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
        <AdSlot marginVertical={20} />

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
          <GameHorizontalScrollSkeleton title={t("games.details.similar")} />
        ) : (
          <GameHorizontalScroll
            title={t("games.details.similar")}
            games={similarGames}
            onGamePress={handleNavigateToGame}
          />
        )}
      </View>
    </>
  );
};

export default memo(GameDetailsContent);
