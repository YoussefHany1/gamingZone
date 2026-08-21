import Image from "next/image";
import { Star, ShieldAlert, Bookmark } from "lucide-react";
import { getAgeRatingLabel } from "../utils";
import { GameHeroProps } from "../types";

export default function GameHero({
  game,
  coverUrl,
  rating,
  activeAgeRating,
  user,
  userRating,
  handleRateGame,
  setListModalOpen,
  t,
}: GameHeroProps) {
  return (
    <>
      <div className="relative w-full h-80 sm:h-112.5 overflow-hidden z-0 border-b border-white/5 shadow-2xl">
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
        <div className="absolute inset-0 bg-linear-to-t from-primary-bg via-primary-bg/60 to-transparent"></div>

        {/* Floating Hero details */}
        <div className="absolute bottom-6 inset-x-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 z-10 text-center">
          {/* Cover Art */}
          <div className="relative w-28 sm:w-36 aspect-3/4 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-white/5">
            <Image
              src={coverUrl}
              alt={game.name}
              fill
              sizes="(max-width: 640px) 112px, 144px"
              className="object-cover"
            />
          </div>

          {/* Core Info */}
          <div className="space-y-3 grow pb-1">
            {/* Title & Star Rating on same line */}
            <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-between">
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
          </div>
        </div>
      </div>
      {/* Add to List button — floating below hero */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 z-10 relative flex flex-wrap items-center gap-4">
        <button
          id="add-to-list-btn"
          onClick={() => {
            if (!user || user.isAnonymous) {
              window.location.href = "/auth/login";
              return;
            }
            setListModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-linear-to-r from-secondary-blue to-light-blue font-bold text-sm shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all duration-300"
        >
          <Bookmark className="w-4 h-4" />
          {t("games.details.addToList")}
        </button>

        {/* Rating Section */}
        {user && !user.isAnonymous && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl">
            <span className="text-sm font-bold text-white/70">
              {t("games.details.rateThisGame") ?? "Rate this Game"}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRateGame(userRating === star ? 0 : star)}
                  className="hover:scale-110 active:scale-95 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 transition-colors ${
                      star <= userRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/30 hover:text-white/60"
                    }`}
                  />
                </button>
              ))}
            </div>
            {userRating > 0 && (
              <span className="text-xs font-black text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md">
                {userRating} / 5
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
