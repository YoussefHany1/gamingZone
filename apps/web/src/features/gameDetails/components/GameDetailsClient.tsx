"use client";

import { useLangStore } from "@/store/useLangStore";
import dynamic from "next/dynamic";
import { useGameDetailsLogic } from "../hooks/useGameDetailsLogic";
import { GameDetailsClientProps } from "../types";

// Import components
import GameHero from "./GameHero";
import GameStoresGrid from "./GameStoresGrid";
import GameAbout from "./GameAbout";
import GameScreenshots from "./GameScreenshots";
import GamePcRequirements from "./GamePcRequirements";
import GameLanguages from "./GameLanguages";
import GameSeries from "./GameSeries";
import GameSimilar from "./GameSimilar";
import GameSpecifications from "./GameSpecifications";
import GamePlayTime from "./GamePlayTime";
import GameVideos from "./GameVideos";

const ListSelectionModal = dynamic(
  () => import("@/components/ListSelectionModal"),
  {
    ssr: false,
  },
);

export default function GameDetailsClient({
  game,
  pcSpecs,
  rating,
  playTime,
  languageRows,
  activeAgeRating,
  gameStores,
  coverUrl,
}: GameDetailsClientProps) {
  const { lang, t } = useLangStore();
  const isRtl = lang === "ar";

  const {
    user,
    activeScreenshotIdx,
    setActiveScreenshotIdx,
    zoomScale,
    setZoomScale,
    activeVideoId,
    setActiveVideoId,
    listModalOpen,
    setListModalOpen,
    userRating,
    gameDataForList,
    handleRateGame,
    handleNextScreenshot,
    handlePrevScreenshot,
  } = useGameDetailsLogic(game, isRtl);

  const seriesGames = game.collections?.[0]?.games || [];
  const similarGames = game.similar_games || [];

  return (
    <div
      className={`w-full ${isRtl ? "rtl" : "ltr"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <GameHero
        game={game}
        coverUrl={coverUrl}
        rating={rating}
        activeAgeRating={activeAgeRating}
        user={user}
        userRating={userRating}
        handleRateGame={handleRateGame}
        setListModalOpen={setListModalOpen}
       t={t} lang={lang} />

      {/* ListSelectionModal */}
      <ListSelectionModal
        visible={listModalOpen}
        onClose={() => setListModalOpen(false)}
        gameId={game.id}
        gameData={gameDataForList}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative">
        {/* Left Col (About, Trailer, Specs, Collections) */}
        <div className="lg:col-span-2 space-y-8">
          <GameStoresGrid gameStores={gameStores}  t={t} lang={lang} />
          
          <GameAbout summary={game.summary}  t={t} lang={lang} />
          
          <GameScreenshots
            screenshots={game.screenshots}
            activeScreenshotIdx={activeScreenshotIdx}
            setActiveScreenshotIdx={setActiveScreenshotIdx}
            handleNextScreenshot={handleNextScreenshot}
            handlePrevScreenshot={handlePrevScreenshot}
            zoomScale={zoomScale}
            setZoomScale={setZoomScale}
           t={t} lang={lang} />
          
          <GamePcRequirements pcSpecs={pcSpecs}  t={t} lang={lang} />
          
          <GameLanguages languageRows={languageRows}  t={t} lang={lang} />
          
          <GameSeries seriesGames={seriesGames}  t={t} lang={lang} />
          
          <GameSimilar similarGames={similarGames}  t={t} lang={lang} />
        </div>

        {/* Right Col (Specifications, HLTB, Videos) */}
        <div className="space-y-6">
          <GameSpecifications game={game}  t={t} lang={lang} />
          
          <GamePlayTime playTime={playTime}  t={t} lang={lang} />
          
          <GameVideos
            videos={game.videos}
            activeVideoId={activeVideoId}
            setActiveVideoId={setActiveVideoId}
           t={t} lang={lang} />
        </div>
      </main>
    </div>
  );
}
