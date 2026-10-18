import { useCallback, type Dispatch, type SetStateAction } from "react";
import { Alert, ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { storageSet } from "@/src/lib/storage";
import {
  saveGameRating,
  syncRatingFieldAcrossLists,
} from "@/src/services/ratingService";
import type { GameEntry } from "../types";
import { logger } from "@/src/lib/logger";

type UseGameMutationsOptions = {
  games: GameEntry[];
  setGames: Dispatch<SetStateAction<GameEntry[]>>;
  listId: string;
  targetUserId: string | null;
  cacheKey: string | null;
  /** True when viewing someone else's list — mutations are disabled. */
  isSharedList: boolean;
};

/**
 * Removes and rates games inside a list, keeping the "rated" list, the ratings
 * collection and the local MMKV cache in sync. Owner-only; no-ops on shared
 * lists.
 */
export function useGameMutations({
  games,
  setGames,
  listId,
  targetUserId,
  cacheKey,
  isSharedList,
}: UseGameMutationsOptions): {
  removeGame: (gameId: string | number, gameName: string) => void;
  rateGame: (gameId: string | number, newRating: number) => Promise<void>;
} {
  const { t } = useTranslation();
  const currentUser = auth().currentUser;

  const removeGame = useCallback(
    (gameId: string | number, gameName: string): void => {
      if (isSharedList || !targetUserId || !cacheKey) return;
      Alert.alert(
        t("userLists.actions.confirmDeleteTitle"),
        t("userLists.actions.confirmDeleteMessage", { gameName }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.remove"),
            style: "destructive",
            onPress: async () => {
              const gameIdStr = String(gameId);
              const oldGames = [...games];
              const newGames = games.filter((g) => String(g.id) !== gameIdStr);
              setGames(newGames);
              storageSet(cacheKey, newGames);
              try {
                await firestore()
                  .collection("users")
                  .doc(targetUserId)
                  .collection("lists")
                  .doc(listId)
                  .collection("games")
                  .doc(gameIdStr)
                  .delete();

                if (listId === "rated") {
                  // Clear the rating itself, then mirror its absence into the
                  // user's other lists.
                  await firestore()
                    .collection("users")
                    .doc(targetUserId)
                    .collection("ratings")
                    .doc(gameIdStr)
                    .delete();

                  await syncRatingFieldAcrossLists(targetUserId, gameIdStr, 0);
                }
              } catch {
                setGames(oldGames);
                storageSet(cacheKey, oldGames);
                ToastAndroid.show(
                  t("settings.userGames.messages.removeError"),
                  ToastAndroid.LONG,
                );
              }
            },
          },
        ],
      );
    },
    [isSharedList, targetUserId, cacheKey, games, listId, t, setGames],
  );

  const rateGame = useCallback(
    async (gameId: string | number, newRating: number): Promise<void> => {
      if (!currentUser || currentUser.isAnonymous) return;
      // The rated-game document is built from the entry in this list, so the
      // game has to be present for a rating to be written.
      const game = games.find((g) => String(g.id) === String(gameId));
      if (!game) return;

      try {
        await saveGameRating(currentUser.uid, gameId, newRating, game);
      } catch (e) {
        logger.error("Error rating game inside list:", e);
      }
    },
    [currentUser, games],
  );

  return { removeGame, rateGame };
}
