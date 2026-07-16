import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
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
import { GameEntry } from "../types";

export function useListDetails(paramsPromise: Promise<{ listId: string }>) {
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

  const listNameParam = searchParams.get("name") ?? "";
  const ownerIdParam = searchParams.get("ownerId") ?? "";

  const hasOwnerIdInUrl =
    typeof window !== "undefined" && window.location.search.includes("ownerId");
  const isSharedList =
    (ownerIdParam !== "" || hasOwnerIdInUrl) &&
    (!user || ownerIdParam !== user.uid);

  const ownerId =
    ownerIdParam ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("ownerId")
      : null) ||
    "";
  const listName =
    listNameParam ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("name")
      : null) ||
    "";

  const targetUid = isSharedList ? ownerId : user ? user.uid : "";

  // Resolve async params
  useEffect(() => {
    paramsPromise.then((p) => setListId(p.listId));
  }, [paramsPromise]);

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
                  `[useListDetails] Stale cache update handled for list ${listDoc.id}`,
                );
              }
            }
          }
        }
        toast.success(t("userLists.success.removed") || "Game removed successfully");
      } catch (err) {
        // Revert on failure
        setGames(oldGames);
        console.error("Remove game error:", err);
        toast.error(t("common.error") || "An error occurred");
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
                `[useListDetails] Stale cache update handled for list ${listDoc.id}`,
              );
            }
          }
        }
        toast.success(t("userLists.success.rated") || "Game rated successfully");
      } catch (error) {
        console.error("Error rating game inside list:", error);
        toast.error(t("common.error") || "An error occurred");
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

  return {
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
  };
}
