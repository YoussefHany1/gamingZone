import { useCallback, useEffect, useState } from "react";
import { Alert, ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { DEFAULT_LIST_IDS, DEFAULT_LISTS } from "../constants";
import type { UserList } from "../types";
import { logger } from "@/src/lib/logger";

/**
 * Owns the "My Lists" data: seeds the built-in lists, subscribes to the user's
 * list documents (ordered defaults-first, then custom lists by creation time)
 * and exposes create/delete actions.
 */
export function useUserLists(): {
  lists: UserList[];
  createList: (name: string, description: string) => Promise<boolean>;
  isCreating: boolean;
  deleteList: (listId: string, listName: string) => void;
  /** Last snapshot error message, or null while healthy. */
  error: string | null;
  /** True while a pull-to-refresh re-subscription is in flight. */
  refreshing: boolean;
  refresh: () => void;
} {
  const { user, isAnonymous } = useAuthUser();
  const { t } = useTranslation();
  const [lists, setLists] = useState<UserList[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Changed by `refresh` to force the snapshot subscription below to restart.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || isAnonymous) return;

    const listsRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("lists");

    const initDefaults = async (): Promise<void> => {
      try {
        const snap = await listsRef.get();

        const docRated = await listsRef.doc("rated").get();
        if (docRated && !docRated.exists) {
          await listsRef.doc("rated").set({
            name: "Rated",
            type: "default",
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        if (snap.empty) {
          const batch = firestore().batch();
          DEFAULT_LISTS.forEach(({ id, name, type }) => {
            if (id === "rated") return;
            batch.set(listsRef.doc(id), {
              name,
              type,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        } else {
          for (const doc of snap.docs) {
            const data = doc.data();
            if (data.type === "default" && !DEFAULT_LIST_IDS.includes(doc.id)) {
              await doc.ref.delete();
            }
          }
        }
      } catch (error) {
        logger.error("[useUserLists] initDefaults error:", error);
      }
    };

    initDefaults();

    const unsub = listsRef.onSnapshot(
      (snap) => {
        const parsed = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UserList, "id">),
        }));
        parsed.sort((a, b) => {
          const aIdx = DEFAULT_LIST_IDS.indexOf(a.id);
          const bIdx = DEFAULT_LIST_IDS.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return aTime - bTime || a.name.localeCompare(b.name);
        });
        setLists(parsed);
        setError(null);
        setRefreshing(false);
      },
      (error) => {
        logger.error("[useUserLists] onSnapshot error:", error);
        // The screen's FlashList previously rendered a blank page with no way
        // to distinguish "no lists" from a failed subscription — surface it.
        setError(t("common.dataLoadError"));
        setRefreshing(false);
      },
    );

    return () => unsub();
  }, [user, isAnonymous, refreshKey, t]);

  const refresh = useCallback((): void => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const createList = useCallback(
    async (name: string, description: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      const exists = lists.some(
        (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) {
        ToastAndroid.show(
          t("userLists.errors.listAlreadyExists") ??
            "A list with this name already exists",
          ToastAndroid.LONG,
        );
        return false;
      }

      const currentUser = auth().currentUser;
      if (!currentUser) return false;

      setIsCreating(true);
      try {
        const ref = firestore()
          .collection("users")
          .doc(currentUser.uid)
          .collection("lists")
          .doc();
        await ref.set({
          name: trimmed,
          description: description.trim(),
          type: "custom",
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        return true;
      } catch (error) {
        logger.error("[useUserLists] Create list error:", error);
        ToastAndroid.show(
          t("userLists.errors.couldNotCreateList"),
          ToastAndroid.LONG,
        );
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [lists, t],
  );

  const deleteList = useCallback(
    (listId: string, listName: string): void => {
      if (!user) return;
      Alert.alert(
        t("userLists.actions.confirmDeleteTitle"),
        t("userLists.actions.confirmDeleteMessage", { gameName: listName }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.remove"),
            style: "destructive",
            onPress: async () => {
              try {
                await firestore()
                  .collection("users")
                  .doc(user.uid)
                  .collection("lists")
                  .doc(listId)
                  .delete();
              } catch (error) {
                logger.error("[useUserLists] Delete list error:", error);
                ToastAndroid.show(
                  t("userLists.errors.couldNotDeleteList"),
                  ToastAndroid.LONG,
                );
              }
            },
          },
        ],
      );
    },
    [user, t],
  );

  return {
    lists,
    createList,
    isCreating,
    deleteList,
    error,
    refreshing,
    refresh,
  };
}
