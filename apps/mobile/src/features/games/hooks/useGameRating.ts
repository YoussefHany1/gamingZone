import { useCallback, useEffect, useState } from "react";
import { Alert, ToastAndroid } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/src/store/useAuthStore";
import { saveGameRating } from "@/src/services/ratingService";
import type { GameEntry } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";

export type GameRating = {
  rating: number;
  /** Saves a new rating (0 clears it). Prompts for login when signed out. */
  rateGame: (newRating: number) => Promise<void>;
};

/**
 * The signed-in user's rating for the game on screen.
 *
 * Read through a Firestore snapshot, so a rating changed elsewhere — the same
 * account on another device, or the lists screen — is reflected here without a
 * refetch. Written through the shared rating service, which keeps the "rated"
 * list, the ratings collection and the user's other lists in sync.
 */
export function useGameRating(
  currentId: number | string,
  listEntry: GameEntry | null,
): GameRating {
  const [rating, setRating] = useState<number>(0);
  const user = useAuthStore(useShallow((s) => s.user));
  const { t } = useTranslation();

  useEffect(() => {
    // Signed-out and anonymous users have no rating document to watch.
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
        if (doc && doc.exists()) {
          setRating(doc.data()?.rating ?? 0);
        } else {
          setRating(0);
        }
      },
      (error) => {
        logger.error("[useGameRating] Rating snapshot error:", error);
      },
    );

    return unsub;
  }, [user, currentId]);

  const rateGame = useCallback(
    async (newRating: number): Promise<void> => {
      if (!user || user.isAnonymous) {
        Alert.alert(t("common.error"), t("common.loginRequired"));
        return;
      }

      // `listEntry` is null exactly when the game has not loaded yet, so it
      // doubles as the "is there anything to rate?" check.
      if (!listEntry) return;

      try {
        await saveGameRating(user.uid, currentId, newRating, listEntry);
      } catch (e) {
        logger.error("Error rating game:", e);
        ToastAndroid.show(
          t("games.details.ratingFailed") ??
            "Couldn't save your rating. Please try again.",
          ToastAndroid.LONG,
        );
      }
    },
    [user, currentId, listEntry, t],
  );

  return { rating, rateGame };
}
