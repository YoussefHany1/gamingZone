import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocs,
  updateDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { GameData } from "../types";

export function useGameDetailsLogic(game: GameData, isRtl: boolean) {
  const user = useAuthStore((s) => s.user);
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);

  const gameDataForList = useMemo(
    () => ({
      id: String(game.id),
      name: game.name,
      cover_image_id: game.cover?.image_id ?? null,
      release_date: game.release_dates?.[0]?.human ?? "",
    }),
    [game],
  );

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setUserRating(0);
      return;
    }

    const ratingDocRef = doc(db, "users", user.uid, "ratings", String(game.id));
    const unsub = onSnapshot(ratingDocRef, (snap) => {
      if (snap.exists()) {
        setUserRating(snap.data()?.rating ?? 0);
      } else {
        setUserRating(0);
      }
    });

    return unsub;
  }, [user, game.id]);

  const handleRateGame = useCallback(
    async (newRating: number) => {
      if (!user || user.isAnonymous) {
        window.location.href = "/auth/login";
        return;
      }

      const ratingDocRef = doc(db, "users", user.uid, "ratings", String(game.id));
      const ratedGameRef = doc(db, "users", user.uid, "lists", "rated", "games", String(game.id));

      try {
        if (newRating === 0) {
          await deleteDoc(ratingDocRef);
          await deleteDoc(ratedGameRef);
        } else {
          await setDoc(
            doc(db, "users", user.uid, "lists", "rated"),
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
            ...gameDataForList,
            rating: newRating,
            ratedAt: serverTimestamp(),
          });
        }

        // Sync with other lists
        const listsRef = collection(db, "users", user.uid, "lists");
        const listsSnap = await getDocs(listsRef);
        for (const listDoc of listsSnap.docs) {
          if (listDoc.id === "rated") continue;
          const gRef = doc(db, "users", user.uid, "lists", listDoc.id, "games", String(game.id));
          const gSnap = await getDocs(collection(db, "users", user.uid, "lists", listDoc.id, "games"));
          const exists = gSnap.docs.some((d) => d.id === String(game.id));
          if (exists) {
            try {
              if (newRating === 0) {
                await updateDoc(gRef, { rating: deleteField() });
              } else {
                await updateDoc(gRef, { rating: newRating });
              }
            } catch (updateErr) {
              console.log(`[GameDetailsClient] Stale cache update handled for list ${listDoc.id}`);
            }
          }
        }
      } catch (error) {
        console.error("Error rating game:", error);
      }
    },
    [user, game.id, gameDataForList],
  );

  const handleNextScreenshot = useCallback(() => {
    if (activeScreenshotIdx === null || !game.screenshots) return;
    setZoomScale(1);
    setActiveScreenshotIdx((activeScreenshotIdx + 1) % game.screenshots.length);
  }, [activeScreenshotIdx, game.screenshots]);

  const handlePrevScreenshot = useCallback(() => {
    if (activeScreenshotIdx === null || !game.screenshots) return;
    setZoomScale(1);
    setActiveScreenshotIdx(
      (activeScreenshotIdx - 1 + game.screenshots.length) % game.screenshots.length,
    );
  }, [activeScreenshotIdx, game.screenshots]);

  useEffect(() => {
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
  }, [activeScreenshotIdx, handleNextScreenshot, handlePrevScreenshot, isRtl]);

  return {
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
  };
}
