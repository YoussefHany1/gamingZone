"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useLangStore } from "../../store/useLangStore";
import { useAuthStore } from "../../store/useAuthStore";
import dynamic from "next/dynamic";

const ListSelectionModal = dynamic(() => import("../ListSelectionModal"), {
  ssr: false,
});
import {
  Star,
  Play,
  Globe,
  Monitor,
  Check,
  Gamepad2,
  ShoppingCart,
  Clock,
  Cpu,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Bookmark,
} from "lucide-react";

interface Website {
  id: number;
  type: number;
  url: string;
}

interface Company {
  id: number;
  name: string;
}

interface InvolvedCompany {
  id: number;
  developer: boolean;
  publisher: boolean;
  company: Company;
}

interface CollectionGame {
  id: number;
  name: string;
  cover?: { image_id: string };
}

interface SimilarGame {
  id: number;
  name: string;
  cover?: { image_id: string };
}

interface SpecRow {
  label: string;
  value: string;
}

interface PcRequirements {
  minimum: SpecRow[];
  recommended: SpecRow[];
}

interface GameData {
  id: number;
  name: string;
  summary?: string;
  cover?: { image_id: string };
  total_rating?: number;
  total_rating_count?: number;
  release_dates?: { human?: string }[];
  platforms?: { id: number; name: string; abbreviation?: string }[];
  genres?: { id: number; name: string }[];
  game_modes?: { id: number; name: string }[];
  age_ratings?: { organization: number; rating_category: number }[];
  involved_companies?: InvolvedCompany[];
  game_engines?: { id: number; name: string }[];
  videos?: { name?: string; video_id: string }[];
  screenshots?: { image_id: string }[];
  language_supports?: {
    language: { name: string };
    language_support_type: { name: string };
  }[];
  game_time_to_beats?: {
    hastily?: number;
    normally?: number;
    completely?: number;
  };
  websites?: Website[];
  collections?: { games?: CollectionGame[] }[];
  similar_games?: SimilarGame[];
}

interface Props {
  game: GameData;
  pcSpecs: PcRequirements | null;
  rating: number;
  playTime: {
    main: number | null;
    mainExtra: number | null;
    completionist: number | null;
  } | null;
  languageRows: {
    name: string;
    Audio: boolean;
    Subtitles: boolean;
    Interface: boolean;
  }[];
  activeAgeRating:
    | { organization: number; rating_category: number }
    | undefined;
  gameStores: any[];
  coverUrl: string;
}

function getAgeRatingLabel(ratingCategory: number): string {
  const map: Record<number, string> = {
    1: "3+",
    2: "7+",
    3: "12+",
    4: "16+",
    5: "18+",
    6: "RP",
    7: "3+",
    8: "3+",
    9: "10+",
    10: "13+",
    11: "17+",
    12: "18+",
  };
  return map[ratingCategory] ?? "RP";
}

export default function GameDetailsClient({
  game,
  pcSpecs,
  rating,
  playTime,
  languageRows,
  activeAgeRating,
  gameStores,
  coverUrl,
}: Props) {
  const { t, lang } = useLangStore();
  const user = useAuthStore((s) => s.user);
  const [activeScreenshotIdx, setActiveScreenshotIdx] = React.useState<
    number | null
  >(null);
  const [zoomScale, setZoomScale] = React.useState<number>(1);
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null);
  const [listModalOpen, setListModalOpen] = React.useState(false);

  // Prepare game data for Firestore (same shape as the mobile app)
  const gameDataForList = React.useMemo(
    () => ({
      id: String(game.id),
      name: game.name,
      cover_image_id: game.cover?.image_id ?? null,
      release_date: game.release_dates?.[0]?.human ?? "",
    }),
    [game],
  );

  const handleNextScreenshot = React.useCallback(() => {
    if (activeScreenshotIdx === null || !game.screenshots) return;
    setZoomScale(1);
    setActiveScreenshotIdx((activeScreenshotIdx + 1) % game.screenshots.length);
  }, [activeScreenshotIdx, game.screenshots]);

  const handlePrevScreenshot = React.useCallback(() => {
    if (activeScreenshotIdx === null || !game.screenshots) return;
    setZoomScale(1);
    setActiveScreenshotIdx(
      (activeScreenshotIdx - 1 + game.screenshots.length) %
        game.screenshots.length,
    );
  }, [activeScreenshotIdx, game.screenshots]);

  React.useEffect(() => {
    if (activeScreenshotIdx === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveScreenshotIdx(null);
      if (e.key === "ArrowRight") {
        if (isRtl) handlePrevScreenshot();
        else handleNextScreenshot();
      }
      if (e.key === "ArrowLeft") {
        if (isRtl) handleNextScreenshot();
        else handlePrevScreenshot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeScreenshotIdx, handleNextScreenshot, handlePrevScreenshot]);

  const isRtl = lang === "ar";
  const textDirectionClass = isRtl ? "text-right" : "text-left";
  const flexDirectionClass = isRtl ? "flex-row-reverse" : "flex-row";

  // Series and Similar games lists
  const seriesGames = game.collections?.[0]?.games || [];
  const similarGames = game.similar_games || [];

  return (
    <div
      className={`w-full ${isRtl ? "rtl" : "ltr"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Hero Header backdrop */}
      <div className="relative w-full h-[320px] sm:h-[450px] overflow-hidden z-0 border-b border-white/5 shadow-2xl">
        <Image
          src={
            game.screenshots?.[0]?.image_id
              ? `https://images.igdb.com/igdb/image/upload/t_screenshot_huge/${game.screenshots[0].image_id}.webp`
              : coverUrl
          }
          alt={game.name}
          fill
          priority
          sizes="100vw"
          className="object-cover filter blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-bg via-primary-bg/60 to-transparent"></div>

        {/* Floating Hero details */}
        <div
          className={`absolute bottom-6 inset-x-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 z-10 text-center sm:${isRtl ? "text-right" : "text-left"}`}
        >
          {/* Cover Art */}
          <div className="relative w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 bg-white/5">
            <Image
              src={coverUrl}
              alt={game.name}
              fill
              sizes="(max-width: 640px) 112px, 144px"
              className="object-cover"
            />
          </div>

          {/* Core Info */}
          <div className="space-y-3 flex-grow pb-1">
            {/* Title & Star Rating on same line */}
            <div
              className={`flex flex-wrap items-center gap-4 justify-center sm:justify-between ${isRtl ? "flex-row-reverse" : "flex-row"}`}
            >
              <div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                  {game.name}
                </h1>
                <div className="flex flex-wrap flex-col justify-center items-start sm:justify-start gap-2.5 text-xs">
                  {game.release_dates?.[0]?.human && (
                    <p className="text-xs  font-bold text-gray-300 ml-2.5 mb-2">
                      {game.release_dates[0].human}
                    </p>
                  )}
                  <div>
                    {game.platforms &&
                      game.platforms.slice(0, 4).map((p, i) => (
                        <span
                          key={i}
                          className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-300 mr-2"
                        >
                          {p.abbreviation || p.name}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
              {rating > 0 && (
                <div className="flex flex-col items-center">
                  <span className="flex justify-center w-fit bg-yellow-400/10 border border-yellow-400/20 py-4 px-3 rounded-full text-yellow-400 font-extrabold shadow-sm">
                    <span className="text-3xl ">{rating.toFixed(1)}</span>
                  </span>
                  <p className="text-sm mb-3 mt-1 text-center">
                    {game.total_rating_count} {t("games.details.userRatings")}
                  </p>
                  {activeAgeRating && (
                    <p className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl text-red-400 font-extrabold flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>
                        {getAgeRatingLabel(activeAgeRating.rating_category)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Age Rating and Platforms under the title line */}
          </div>
        </div>
      </div>
      {/* Add to List button — floating below hero */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 z-10 relative">
        <button
          id="add-to-list-btn"
          onClick={() => {
            if (!user || user.isAnonymous) {
              window.location.href = "/auth/login";
              return;
            }
            setListModalOpen(true);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-bold text-sm shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all duration-300 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
        >
          <Bookmark className="w-4 h-4" />
          {t("games.details.addToList")}
        </button>
      </div>

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
          {/* Active Stores Grid */}
          {gameStores.length > 0 && (
            <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
              <h2
                className={`text-lg font-black text-white border-b border-white/5 pb-2 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
              >
                <ShoppingCart className="w-5 h-5 text-light-blue" />
                <span>{t("games.details.availableStores")}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {gameStores.map((store) => (
                  <a
                    key={store.id}
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-3.5 rounded-2xl border bg-gradient-to-r ${store.bg} hover:scale-102 transition-all active:scale-98 shadow-md ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className="relative w-6 h-6 flex-shrink-0">
                        <Image
                          src={store.logo}
                          alt={store.name}
                          width={50}
                          height={50}
                          className="object-contain w-full h-full filter brightness-110"
                        />
                      </div>
                      <span className="font-black text-xs sm:text-sm tracking-wide">
                        {store.name}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* About Summary */}
          {game.summary && (
            <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
              <h2
                className={`text-lg font-black text-white border-b border-white/5 pb-2 ${textDirectionClass}`}
              >
                {t("games.details.about")}
              </h2>
              <p
                className={`text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line ${textDirectionClass}`}
              >
                {game.summary}
              </p>
            </section>
          )}

          {/* Screenshots Gallery */}
          {game.screenshots && game.screenshots.length > 0 && (
            <section className="space-y-4">
              <h2
                className={`text-lg font-black text-white ${textDirectionClass}`}
              >
                {t("games.details.screenshotsGallery")}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar px-1">
                {game.screenshots.map((scr, idx) => {
                  const medUrl = `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${scr.image_id}.webp`;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveScreenshotIdx(idx)}
                      className="relative flex-shrink-0 w-80 aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 shadow-md bg-white/5 cursor-pointer hover:border-light-blue/30 active:scale-98 transition-all group"
                    >
                      <Image
                        src={medUrl}
                        alt={`Screenshot ${idx + 1}`}
                        fill
                        sizes="320px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* PC System Requirements */}
          {pcSpecs && (
            <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-5 shadow-xl">
              <h2
                className={`text-lg font-black text-white border-b border-white/5 pb-2 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
              >
                <Monitor className="w-5 h-5 text-light-blue" />
                <span>{t("games.details.pcRequirements")}</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Minimum Specs */}
                {pcSpecs.minimum.length > 0 && (
                  <div className="space-y-3.5">
                    <h3
                      className={`text-sm font-black text-[#66c0f4] flex items-center gap-2 border-b border-white/5 pb-1.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Cpu className="w-4 h-4" />
                      <span>{t("games.details.minimum")}</span>
                    </h3>
                    <div className="space-y-3">
                      {pcSpecs.minimum.map((row, i) => (
                        <div
                          key={i}
                          className={`text-xs space-y-1 ${textDirectionClass}`}
                        >
                          <span className="text-gray-400 font-bold block capitalize">
                            {row.label}
                          </span>
                          <span className="text-gray-200 block bg-white/5 px-3 py-2 rounded-xl leading-relaxed">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Specs */}
                {pcSpecs.recommended.length > 0 && (
                  <div className="space-y-3.5">
                    <h3
                      className={`text-sm font-black text-light-blue flex items-center gap-2 border-b border-white/5 pb-1.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Cpu className="w-4 h-4" />
                      <span>{t("games.details.recommended")}</span>
                    </h3>
                    <div className="space-y-3">
                      {pcSpecs.recommended.map((row, i) => (
                        <div
                          key={i}
                          className={`text-xs space-y-1 ${textDirectionClass}`}
                        >
                          <span className="text-gray-400 font-bold block capitalize">
                            {row.label}
                          </span>
                          <span className="text-gray-200 block bg-white/5 px-3 py-2 rounded-xl leading-relaxed">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Languages Support dynamic table */}
          {languageRows.length > 0 && (
            <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl overflow-hidden">
              <h2
                className={`text-lg font-black text-white border-b border-white/5 pb-2 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
              >
                <Globe className="w-5 h-5 text-light-blue" />
                <span>{t("games.details.languages.title")}</span>
              </h2>

              <div className="overflow-x-auto scrollbar">
                <table className="w-full border-collapse text-xs sm:text-sm min-w-[400px]">
                  <thead>
                    <tr
                      className={`border-b border-white/10 text-gray-400 uppercase font-black tracking-wider text-[9px] sm:text-[10px] ${textDirectionClass}`}
                    >
                      <th
                        className={`py-3 px-4 ${isRtl ? "text-right" : "text-left"}`}
                      >
                        {t("games.details.languages.Language")}
                      </th>
                      <th className="py-3 px-4 text-center">
                        {t("games.details.languages.audio")}
                      </th>
                      <th className="py-3 px-4 text-center">
                        {t("games.details.languages.subtitles")}
                      </th>
                      <th className="py-3 px-4 text-center">
                        {t("games.details.languages.interface")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {languageRows.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                          i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                        }`}
                      >
                        <td
                          className={`py-3.5 px-4 font-extrabold text-white capitalize ${isRtl ? "text-right" : "text-left"}`}
                        >
                          {row.name}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.Audio ? (
                            <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-light-blue/15 border border-light-blue/20 text-light-blue shadow-sm shadow-light-blue/5">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-gray-600 font-bold">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.Subtitles ? (
                            <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-light-blue/15 border border-light-blue/20 text-light-blue shadow-sm shadow-light-blue/5">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-gray-600 font-bold">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.Interface ? (
                            <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-light-blue/15 border border-light-blue/20 text-light-blue shadow-sm shadow-light-blue/5">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-gray-600 font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Game Series list */}
          {seriesGames.length > 0 && (
            <section className="space-y-4">
              <h2
                className={`text-lg font-black text-white flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
              >
                <Gamepad2 className="w-5 h-5 text-light-blue" />
                <span>{t("games.details.series")}</span>
              </h2>

              <div
                className="flex gap-4 overflow-x-auto pb-3 scrollbar"
                dir={isRtl ? "rtl" : "ltr"}
              >
                {seriesGames.map((g) => {
                  const sCover = g.cover?.image_id
                    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.webp`
                    : "/placeholder-news.jpg";
                  return (
                    <Link
                      key={g.id}
                      href={`/games/${g.id}`}
                      className="flex-shrink-0 w-32 group space-y-2 block"
                    >
                      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/5 bg-white/5 transition-transform duration-300 group-hover:-translate-y-1">
                        <Image
                          src={sCover}
                          alt={g.name}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold text-gray-300 group-hover:text-light-blue transition-colors line-clamp-2 block leading-snug ${textDirectionClass}`}
                      >
                        {g.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Similar Games list */}
          {similarGames.length > 0 && (
            <section className="space-y-4">
              <h2
                className={`text-lg font-black text-white flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
              >
                <Gamepad2 className="w-5 h-5 text-light-blue animate-pulse" />
                <span>{t("games.details.similar")}</span>
              </h2>

              <div
                className="flex gap-4 overflow-x-auto pb-3 scrollbar"
                dir={isRtl ? "rtl" : "ltr"}
              >
                {similarGames.map((g) => {
                  const sCover = g.cover?.image_id
                    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.webp`
                    : "/placeholder-news.jpg";
                  return (
                    <Link
                      key={g.id}
                      href={`/games/${g.id}`}
                      className="flex-shrink-0 w-32 group space-y-2 block"
                    >
                      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/5 bg-white/5 transition-transform duration-300 group-hover:-translate-y-1">
                        <Image
                          src={sCover}
                          alt={g.name}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold text-gray-300 group-hover:text-light-blue transition-colors line-clamp-2 block leading-snug ${textDirectionClass}`}
                      >
                        {g.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right Col (Specifications, HLTB, Videos) */}
        <div className="space-y-6">
          {/* Quick Specifications */}
          <div className="glass-panel border border-white/10 p-6 rounded-3xl space-y-5 shadow-xl">
            <h2
              className={`text-base font-black text-white border-b border-white/5 pb-2 ${textDirectionClass}`}
            >
              {t("games.details.specifications")}
            </h2>

            <div className="space-y-4 text-xs">
              {/* Developers */}
              {game.involved_companies?.some((c) => c.developer) && (
                <div className={`space-y-1 ${textDirectionClass}`}>
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
                    {t("games.details.developer")}
                  </span>
                  <div className="text-gray-200 font-extrabold text-sm">
                    {game.involved_companies
                      .filter((c) => c.developer)
                      .map((c) => c.company.name)
                      .join(", ")}
                  </div>
                </div>
              )}

              {/* Publishers */}
              {game.involved_companies?.some((c) => c.publisher) && (
                <div
                  className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
                >
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
                    {t("games.details.publisher")}
                  </span>
                  <div className="text-gray-200 font-extrabold text-sm">
                    {game.involved_companies
                      .filter((c) => c.publisher)
                      .map((c) => c.company.name)
                      .join(", ")}
                  </div>
                </div>
              )}

              {/* Genres */}
              {game.genres && game.genres.length > 0 && (
                <div
                  className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
                >
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
                    {t("games.details.genres")}
                  </span>
                  <div
                    className={`flex flex-wrap gap-1.5 mt-1 ${isRtl ? "justify-start flex-row-reverse" : "justify-start"}`}
                  >
                    {game.genres.map((g) => (
                      <span
                        key={g.id}
                        className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Modes */}
              {game.game_modes && game.game_modes.length > 0 && (
                <div
                  className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
                >
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
                    {t("games.details.gameModes")}
                  </span>
                  <div
                    className={`flex flex-wrap gap-1.5 mt-1 ${isRtl ? "justify-start flex-row-reverse" : "justify-start"}`}
                  >
                    {game.game_modes.map((m) => (
                      <span
                        key={m.id}
                        className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold"
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Engines */}
              {game.game_engines && game.game_engines.length > 0 && (
                <div
                  className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
                >
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
                    {t("games.details.engines")}
                  </span>
                  <div className="text-gray-200 font-extrabold text-sm">
                    {game.game_engines.map((e) => e.name).join(", ")}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* How long to beat */}
          {playTime && (
            <div className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
              <h2
                className={`text-base font-black text-white border-b border-white/5 pb-2 flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
              >
                <Clock className="w-4 h-4 text-light-blue" />
                <span>{t("games.details.howLongToBeat.title")}</span>
              </h2>

              <div className="space-y-3 text-xs">
                {playTime.main && (
                  <div
                    className={`flex justify-between items-center bg-white/5 p-3 rounded-2xl ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <span className="text-gray-400 font-bold">
                      {t("games.details.howLongToBeat.main")}
                    </span>
                    <span className="text-light-blue font-black text-sm">
                      {playTime.main} {t("games.details.howLongToBeat.hours")}
                    </span>
                  </div>
                )}

                {playTime.mainExtra && (
                  <div
                    className={`flex justify-between items-center bg-white/5 p-3 rounded-2xl ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <span className="text-gray-400 font-bold">
                      {t("games.details.howLongToBeat.mainExtra")}
                    </span>
                    <span className="text-[#66c0f4] font-black text-sm">
                      {playTime.mainExtra}{" "}
                      {t("games.details.howLongToBeat.hours")}
                    </span>
                  </div>
                )}

                {playTime.completionist && (
                  <div
                    className={`flex justify-between items-center bg-white/5 p-3 rounded-2xl ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <span className="text-gray-400 font-bold">
                      {t("games.details.howLongToBeat.completionist")}
                    </span>
                    <span className="text-light-blue font-black text-sm">
                      {playTime.completionist}{" "}
                      {t("games.details.howLongToBeat.hours")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Videos/Trailers links */}
          {game.videos && game.videos.length > 0 && (
            <div className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
              <h2
                className={`text-base font-black text-white border-b border-white/5 pb-2 flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
              >
                <Play className="w-4 h-4 text-light-blue" />
                <span>{t("games.details.trailer")}</span>
              </h2>

              {/* Inline dynamic player */}
              {activeVideoId && (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0`}
                      title="Game Trailer Player"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setActiveVideoId(null)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-xs flex items-center gap-1 hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t("games.details.closePlayer")}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {game.videos.map((vid, idx) => {
                  const isSelected = activeVideoId === vid.video_id;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveVideoId(vid.video_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 shadow-sm cursor-pointer ${
                        isSelected
                          ? "bg-light-blue/10 border-light-blue text-white font-black"
                          : "bg-white/5 hover:bg-white/10 border-white/5 text-gray-200 hover:text-white"
                      } ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`p-2 rounded-lg text-white ${isSelected ? "bg-light-blue" : "bg-red-600"}`}
                      >
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                      <span
                        className={`truncate flex-grow text-xs font-bold ${textDirectionClass}`}
                      >
                        {vid.name ||
                          (isRtl
                            ? "مشاهدة العرض التشويقي للعبة"
                            : "Watch Game Trailer")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Premium Lightbox Modal with Zoom and Swiping/Navigation */}
      {activeScreenshotIdx !== null && game.screenshots && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-300 select-none"
          onClick={() => setActiveScreenshotIdx(null)}
        >
          {/* Top Control Bar */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image counter */}
            <span className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-300 border border-white/5 shadow-md">
              {activeScreenshotIdx + 1} / {game.screenshots.length}
            </span>

            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setZoomScale((prev) => Math.max(prev - 0.25, 0.75))
                }
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
                title={t("games.details.zoomOut")}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomScale(1)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-gray-200 hover:text-white transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                title={t("games.details.reset")}
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px] font-bold">
                  {Math.round(zoomScale * 100)}%
                </span>
              </button>
              <button
                onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 3))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
                title={t("games.details.zoomIn")}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Close button */}
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-white transition-all hover:scale-105 active:scale-95 shadow-md"
              onClick={() => setActiveScreenshotIdx(null)}
              title={t("common.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Screenshot Container */}
          <div className="relative w-full max-w-5xl aspect-[16/9] flex items-center justify-center">
            {/* Prev arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevScreenshot();
              }}
              className="absolute left-2 sm:-left-16 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-white transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-sm"
              title={t("games.details.previous")}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Centered Image with zoom transform */}
            <div
              className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 bg-white/5 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={`https://images.igdb.com/igdb/image/upload/t_screenshot_huge/${game.screenshots[activeScreenshotIdx].image_id}.webp`}
                alt="Screenshot Large View"
                fill
                priority
                className="object-contain select-none pointer-events-none"
                sizes="100vw"
                style={{
                  transform: `scale(${zoomScale})`,
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>

            {/* Next arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextScreenshot();
              }}
              className="absolute right-2 sm:-right-16 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-white transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-sm"
              title={t("games.details.next")}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
