"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "@/components/Link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  deleteField,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

interface GameEntry {
  id: string | number;
  name: string;
  cover_image_id?: string | null;
  release_date?: string;
  rating?: number;
}

export default function ListGamesPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLangStore();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [listId, setListId] = useState<string>("");
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | number | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const listName = searchParams.get("name") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";

  const isSharedList = ownerId !== "" && (!user || ownerId !== user.uid);
  const targetUid = isSharedList ? ownerId : user ? user.uid : "";

  // Resolve async params
  useEffect(() => {
    params.then((p) => setListId(p.listId));
  }, [params]);

  // i18n list name
  const getDisplayName = useCallback(
    (name: string): string => {
      const map: Record<string, string> = {
        Playing: t("games.details.listStatus.playing"),
        Played: t("games.details.listStatus.played"),
        "Want to Play": t("games.details.listStatus.wantToPlay"),
        Rated: t("games.details.listStatus.rated"),
      };
      return map[name] ?? name;
    },
    [t],
  );

  // Redirect anonymous/unauthenticated users
  useEffect(() => {
    if (!isSharedList && !isLoading && (!user || user.isAnonymous)) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router, isSharedList]);

  // Firestore listener for games in this list
  useEffect(() => {
    if (!targetUid || !listId) return;

    const gamesRef = collection(
      db,
      "users",
      targetUid,
      "lists",
      listId,
      "games",
    );

    const unsub = onSnapshot(
      gamesRef,
      (snap) => {
        const list: GameEntry[] = snap.docs.map((d) => ({
          ...(d.data() as GameEntry),
          id: d.id,
        }));
        setGames(list);
        setLoading(false);
      },
      (error) => {
        console.error("Snapshot error:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [targetUid, listId]);

  // Remove game
  const handleRemoveGame = useCallback(
    async (gameId: string | number) => {
      if (isSharedList || !targetUid || !listId) return;

      // Optimistic update
      const oldGames = [...games];
      setGames(games.filter((g) => String(g.id) !== String(gameId)));

      try {
        await deleteDoc(
          doc(db, "users", targetUid, "lists", listId, "games", String(gameId)),
        );

        if (listId === "rated") {
          // Delete from ratings
          await deleteDoc(
            doc(db, "users", targetUid, "ratings", String(gameId)),
          );

          // Sync other lists
          const listsRef = collection(db, "users", targetUid, "lists");
          const listsSnap = await getDocs(listsRef);
          for (const listDoc of listsSnap.docs) {
            if (listDoc.id === "rated") continue;
            const gRef = doc(
              db,
              "users",
              targetUid,
              "lists",
              listDoc.id,
              "games",
              String(gameId),
            );
            const gSnap = await getDocs(
              collection(db, "users", targetUid, "lists", listDoc.id, "games"),
            );
            const exists = gSnap.docs.some((d) => d.id === String(gameId));
            if (exists) {
              try {
                await updateDoc(gRef, { rating: deleteField() });
              } catch (updateErr) {
                console.log(
                  `[lists/page.tsx] Stale cache update handled for list ${listDoc.id}`,
                );
              }
            }
          }
        }
      } catch {
        // Revert on failure
        setGames(oldGames);
      }
      setDeleteConfirm(null);
    },
    [targetUid, listId, games, isSharedList],
  );

  // Rate game inside list
  const handleRateGame = useCallback(
    async (gameId: string | number, newRating: number) => {
      if (isSharedList || !targetUid || !listId) return;

      const game = games.find((g) => String(g.id) === String(gameId));
      if (!game) return;

      const gameIdStr = String(gameId);

      // Firestore doc references
      const ratingDocRef = doc(db, "users", targetUid, "ratings", gameIdStr);
      const ratedGameRef = doc(
        db,
        "users",
        targetUid,
        "lists",
        "rated",
        "games",
        gameIdStr,
      );

      try {
        if (newRating === 0) {
          await deleteDoc(ratingDocRef);
          await deleteDoc(ratedGameRef);
        } else {
          await setDoc(
            doc(db, "users", targetUid, "lists", "rated"),
            {
              name: "Rated",
              type: "default",
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );

          await setDoc(ratingDocRef, {
            rating: newRating,
            updatedAt: serverTimestamp(),
          });
          await setDoc(ratedGameRef, {
            id: game.id,
            name: game.name,
            cover_image_id: game.cover_image_id ?? null,
            release_date: game.release_date ?? "N/A",
            rating: newRating,
            ratedAt: serverTimestamp(),
          });
        }

        // Sync with other lists
        const listsRef = collection(db, "users", targetUid, "lists");
        const listsSnap = await getDocs(listsRef);
        for (const listDoc of listsSnap.docs) {
          if (listDoc.id === "rated") continue;
          const gRef = doc(
            db,
            "users",
            targetUid,
            "lists",
            listDoc.id,
            "games",
            gameIdStr,
          );
          const gSnap = await getDocs(
            collection(db, "users", targetUid, "lists", listDoc.id, "games"),
          );
          const exists = gSnap.docs.some((d) => d.id === gameIdStr);
          if (exists) {
            try {
              if (newRating === 0) {
                await updateDoc(gRef, { rating: deleteField() });
              } else {
                await updateDoc(gRef, { rating: newRating });
              }
            } catch (updateErr) {
              console.log(
                `[lists/page.tsx] Stale cache update handled for list ${listDoc.id}`,
              );
            }
          }
        }
      } catch (error) {
        console.error("Error rating game inside list:", error);
      }
    },
    [targetUid, listId, games, isSharedList],
  );

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/lists/${listId}?ownerId=${targetUid}&name=${encodeURIComponent(listName)}`;

    if (navigator.share) {
      navigator
        .share({
          title: getDisplayName(listName) || "Games List",
          text: `${t("userLists.actions.shareMessage", { listName: getDisplayName(listName) }) ?? `Check out my games list "${getDisplayName(listName)}":`}`,
          url: shareUrl,
        })
        .catch(console.error);
    } else {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(console.error);
    }
  }, [listId, targetUid, listName, getDisplayName, t]);

  if (isLoading || (!isSharedList && (!user || user.isAnonymous))) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-light-blue animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
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
                  {games.length}{" "}
                  {games.length === 1
                    ? t("common.gameCount")
                    : t("common.gamesCount")}
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
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-semibold shadow-lg hover:opacity-90 transition-all"
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
                  <div
                    key={String(game.id)}
                    className="relative group flex items-center gap-4 p-4 rounded-2xl glass-panel border border-white/10 hover:border-light-blue/20 hover:bg-white/[0.03] transition-all duration-300"
                  >
                    <Link
                      href={`/games/${game.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      {/* Cover */}
                      <div className="relative w-20 h-[105px] rounded-xl overflow-hidden bg-white/5 border border-white/5 flex-shrink-0">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
