import React from "react";
import Link from "@/components/Link";
import Image from "next/image";


import {
  Trash2,
  Loader2,
  Bookmark,
  ArrowLeft,
  Gamepad2,
  Search,
  Share2,
  Star,
} from "lucide-react";
import { useListDetails } from "../hooks/useListDetails";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ListDetailsClient({
  listIdPromise,
}: {
  listIdPromise: Promise<{ listId: string }>;
}) {
  const {
    t,
    user,
    isLoading,
    listId,
    games,
    loading,
    deleteConfirm,
    setDeleteConfirm,
    copied,
    listName,
    isSharedList,
    targetUid,
    getDisplayName,
    handleRemoveGame,
    handleRateGame,
    handleShare,
    router,
  } = useListDetails(listIdPromise);

  if (isLoading || (!isSharedList && (!user || user.isAnonymous))) {
    return (
      <>
        
        <main className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </>
    );
  }

  return (
    <>
      
      <main className="min-h-screen py-10 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/lists")}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">
                  {getDisplayName(listName) || t("navigation.titles.gamesList")}
                </h1>
                <p className="text-sm text-gray-400">
                  {t("userLists.gamesCount", { count: games.length })}
                </p>
              </div>
            </div>

            {targetUid && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-light-blue/20 transition-all font-medium text-sm text-gray-200"
              >
                <Share2 className="w-4 h-4" />
                {copied
                  ? (t("common.copied") ?? "Copied!")
                  : (t("common.share") ?? "Share")}
              </button>
            )}
          </div>

          {/* Games List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-2xl glass-panel border border-white/10 animate-pulse"
                >
                  <div className="w-20 h-[105px] rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-white/10 rounded-lg w-3/4" />
                    <div className="h-3 bg-white/10 rounded-lg w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <Bookmark className="w-20 h-20 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-400">
                {t("settings.userGames.emptyText")}
              </h2>
              <p className="text-gray-500 text-sm">
                {listId === "rated"
                  ? (t("userLists.empty.ratedSub") ??
                    "Rate and review the games you have played here.")
                  : t("settings.userGames.emptySubText")}
              </p>
              {!isSharedList && (
                <Link
                  href="/games"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-secondary-blue to-light-blue font-semibold shadow-lg hover:opacity-90 transition-all"
                >
                  <Search className="w-4 h-4" />
                  {t("settings.userGames.findButton")}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((game) => {
                const coverUrl = game.cover_image_id
                  ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover_image_id}.webp`
                  : null;

                return (
                  <Card
                    key={String(game.id)}
                    hoverEffect
                    className="relative group flex items-center gap-4 p-4"
                  >
                    <Link
                      href={`/games/${game.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      {/* Cover */}
                      <div className="relative w-20 h-[105px] rounded-xl overflow-hidden bg-white/5 border border-white/5 shrink-0">
                        {coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt={game.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white line-clamp-2 group-hover:text-light-blue transition-colors">
                          {game.name}
                        </h3>
                        {game.release_date && (
                          <p className="text-sm text-gray-400 mt-1">
                            {game.release_date}
                          </p>
                        )}
                        {/* Rating Row inside list */}
                        <div className="flex items-center gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isSharedList) {
                                  handleRateGame(
                                    game.id,
                                    game.rating === star ? 0 : star,
                                  );
                                }
                              }}
                              disabled={isSharedList}
                              className={`transition-transform duration-200 ${
                                isSharedList
                                  ? "cursor-default"
                                  : "hover:scale-110 active:scale-95"
                              }`}
                            >
                              <Star
                                className={`w-4 h-4 transition-colors ${
                                  star <= (game.rating ?? 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-white/20"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </Link>

                    {/* Delete */}
                    {!isSharedList &&
                      (deleteConfirm === game.id ? (
                        <div className="flex items-center gap-2 animate-in fade-in duration-200">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            onClick={() => handleRemoveGame(game.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors"
                          >
                            {t("common.remove")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(game.id)}
                          className="p-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ))}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
    </>
  );
}
