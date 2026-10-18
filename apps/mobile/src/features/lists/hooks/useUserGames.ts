import { useCallback, useEffect, useRef, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { storageGet, storageSet } from "@/src/lib/storage";
import { DEFAULT_LIST_IDS } from "../constants";
import type { GameEntry, UserList } from "../types";
import { logger } from "@/src/lib/logger";

type UseUserGamesOptions = {
  listId: string;
  listName: string;
  ownerId?: string | undefined;
};

/**
 * Owns the games-list data for one list: an MMKV-seeded cache, the Firestore
 * subscriptions for the list document (title/description) and its games, plus
 * pull-to-refresh and the derived ownership flags used to gate editing/deletion.
 *
 * The `mountedRef` and both unsubscribers are owned internally — the caller only
 * receives plain state.
 */
export function useUserGames({ listId, listName, ownerId }: UseUserGamesOptions) {
  const { t } = useTranslation();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [listMeta, setListMeta] = useState<UserList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);
  // The games snapshot can fail long after the effect body ran, so the callback
  // reads the latest values through refs instead of closing over them (which
  // would force these values into the effect's dependencies and re-subscribe).
  const gamesRef = useRef(games);
  gamesRef.current = games;
  const tRef = useRef(t);
  tRef.current = t;

  const currentUser = auth().currentUser;
  const isSharedList = Boolean(
    ownerId && (!currentUser || ownerId !== currentUser.uid),
  );
  const targetUserId = isSharedList
    ? (ownerId ?? null)
    : currentUser
      ? currentUser.uid
      : null;
  const cacheKey = targetUserId
    ? `USER_GAMES_${targetUserId}_LIST_${listId}`
    : null;

  // Title / description shown in the screen header.
  const displayTitle = listMeta?.name ?? listName;
  const displayDescription = listMeta?.description ?? "";
  // Default lists (Playing/Played/Want to Play/Rated) keep their fixed,
  // localized titles. Anything else is a user-created custom list.
  const isCustomList = listMeta?.type
    ? listMeta.type === "custom"
    : !DEFAULT_LIST_IDS.includes(listId);
  // Only the signed-in owner of a custom list can edit title/description/games.
  const canEdit = Boolean(
    !isSharedList && isCustomList && currentUser && !currentUser.isAnonymous,
  );
  const isSignedIn = Boolean(currentUser && !currentUser.isAnonymous);

  const refresh = useCallback((): void => {
    setRefreshing(true);
    // Bumping refreshKey re-runs the snapshot effect, forcing a fresh
    // Firestore read that supersedes the cached data.
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};
    let unsubscribeList: () => void = () => {};

    const init = async (): Promise<void> => {
      try {
        if (cacheKey) {
          // MMKV read is synchronous — no await needed
          const parsed = storageGet<GameEntry[]>(cacheKey);
          if (parsed && parsed.length > 0 && mountedRef.current) {
            setGames(parsed);
            setLoading(false);
          }
        }
      } catch (e) {
        logger.error("[useUserGames] Cache read failed", e);
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected && mountedRef.current) {
        setLoading(false);
      }

      // Avoid creating subscriptions after the screen has unmounted (the
      // cleanup would otherwise have already run and miss them).
      if (!mountedRef.current) return;

      // List document (title + description). Readable by any authenticated
      // user so shared lists show their title/description; only the owner can
      // write it.
      unsubscribeList = firestore()
        .collection("users")
        .doc(targetUserId)
        .collection("lists")
        .doc(listId)
        .onSnapshot(
          (snap) => {
            if (!mountedRef.current || !snap.exists()) return;
            setListMeta({
              id: snap.id,
              ...(snap.data() as Omit<UserList, "id">),
            });
          },
          (error) => {
            logger.error("[useUserGames] List doc snapshot error:", error);
          },
        );

      const colRef = firestore()
        .collection("users")
        .doc(targetUserId)
        .collection("lists")
        .doc(listId)
        .collection("games");

      unsubscribe = colRef.onSnapshot(
        (snap) => {
          if (!mountedRef.current) return;
          const list: GameEntry[] = snap.docs.map((d) => ({
            ...(d.data() as GameEntry),
            id: d.id,
          }));
          setGames(list);
          setLoading(false);
          setRefreshing(false);
          if (cacheKey) {
            // Synchronous MMKV write — won't block the snapshot callback
            storageSet(cacheKey, list);
          }
        },
        (error) => {
          logger.error("[useUserGames] Snapshot error:", error);
          if (mountedRef.current) {
            setLoading(false);
            setRefreshing(false);
          }
          if (gamesRef.current.length === 0)
            ToastAndroid.show(
              tRef.current("settings.userGames.messages.loadError"),
              ToastAndroid.LONG,
            );
        },
      );
    };

    init();
    return () => {
      mountedRef.current = false;
      unsubscribe();
      unsubscribeList();
    };
  }, [targetUserId, listId, cacheKey, refreshKey]);

  return {
    games,
    setGames,
    listMeta,
    setListMeta,
    loading,
    refreshing,
    refresh,
    isSharedList,
    targetUserId,
    cacheKey,
    isCustomList,
    canEdit,
    isSignedIn,
    displayTitle,
    displayDescription,
  };
}
