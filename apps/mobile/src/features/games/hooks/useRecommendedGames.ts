import { useEffect, useRef, useState } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { storageDelete, storageGet, storageSet } from "@/src/lib/storage";
import type { Game } from "@/src/types/sharedTypes";
import {
  RECOMMENDED_GAMES_CACHE_KEY,
  isRecommendedGamesCacheFresh,
  recommendedGamesSignature,
  type CachedRecommendations,
  type RecommendedGamesListIds,
  type RecommendedGamesPrefs,
} from "../lib/recommendedGamesCache";
import {
  buildRecommendations,
  type UserListGameDoc,
} from "../lib/buildRecommendations";
import { logger } from "@/src/lib/logger";

/** The three library lists the rail is derived from. */
type LibraryListId = "playing" | "played" | "wantToPlay";

/** How many lists must report before recommendations are built. */
const LIBRARY_LIST_COUNT = 3;

/** True when any library list holds at least one game. */
function hasAnyLibraryGame(ids: RecommendedGamesListIds): boolean {
  return (
    ids.playing.length > 0 || ids.played.length > 0 || ids.wantToPlay.length > 0
  );
}

export type RecommendedGamesState = {
  recommendedGames: Game[];
  loading: boolean;
  basedOnGenre: string | null;
  /** True when the user has at least one game across their library lists. */
  hasLibraryGames: boolean;
  /** True once the three library snapshots have resolved (or no user). */
  libraryReady: boolean;
};

/**
 * Owns the "recommended for you" rail: watches the user's three library lists,
 * rebuilds the recommendations when the library actually changes, and serves the
 * last result from a 7-day cache while the library is unchanged.
 *
 * The ranking rules live in `../lib/recommendationScoring` and the API work in
 * `../lib/buildRecommendations`; this hook only wires them to Firestore and
 * React state.
 */
export function useRecommendedGames(): RecommendedGamesState {
  const [recommendedGames, setRecommendedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [basedOnGenre, setBasedOnGenre] = useState<string | null>(null);
  const [hasLibraryGames, setHasLibraryGames] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false); // prevent concurrent fetches
  const listsInitializedRef = useRef(false); // have all 3 initial list snapshots arrived?
  const prefsInitializedRef = useRef(false); // has first prefs snapshot arrived?
  const snapshotCountRef = useRef(0); // how many initial list snapshots have fired
  const lastHashRef = useRef(""); // last committed combined signature

  // Live list data, written by the snapshot listeners below.
  const idsRef = useRef<RecommendedGamesListIds>({
    playing: [],
    played: [],
    wantToPlay: [],
  });
  const docsRef = useRef<Record<"playing" | "played", UserListGameDoc[]>>({
    playing: [],
    played: [],
  });
  const prefsRef = useRef<RecommendedGamesPrefs>({
    favoriteGenres: [],
    preferredPlatforms: [],
  });

  useEffect(() => {
    mountedRef.current = true;
    fetchingRef.current = false;
    listsInitializedRef.current = false;
    prefsInitializedRef.current = false;
    snapshotCountRef.current = 0;
    lastHashRef.current = "";
    setLibraryReady(false);

    const uid = auth().currentUser?.uid;
    if (!uid) {
      setHasLibraryGames(false);
      setLibraryReady(true);
      setLoading(false);
      return;
    }

    const listsRef = firestore().collection("users").doc(uid).collection("lists");
    const userRef = firestore().collection("users").doc(uid);

    const getSignature = (): string =>
      recommendedGamesSignature(idsRef.current, prefsRef.current);

    /** Serves the cache when it still matches library+prefs, else rebuilds it. */
    const handleHashReady = async (newHash: string): Promise<void> => {
      if (!mountedRef.current) return;
      // Hash unchanged — no work needed.
      if (newHash === lastHashRef.current) return;
      // If a fetch is in flight, let it complete; a follow-up change will trigger again
      // because lastHashRef won't match the latest signature once compared.
      if (fetchingRef.current) return;

      lastHashRef.current = newHash;

      const cached = storageGet<CachedRecommendations>(RECOMMENDED_GAMES_CACHE_KEY);
      if (isRecommendedGamesCacheFresh(cached, newHash, Date.now())) {
        if (mountedRef.current) {
          setRecommendedGames(cached.games);
          setBasedOnGenre(cached.basedOnGenre);
          setLoading(false);
        }
        return;
      }

      // Cache miss or stale — fetch fresh data.
      fetchingRef.current = true;
      setLoading(true);

      try {
        const allUserGames = [...docsRef.current.playing, ...docsRef.current.played];

        const { games, basedOnGenre: genre } = await buildRecommendations(
          uid,
          {
            playing: new Set(idsRef.current.playing),
            played: new Set(idsRef.current.played),
            wantToPlay: new Set(idsRef.current.wantToPlay),
          },
          allUserGames,
        );

        storageSet(RECOMMENDED_GAMES_CACHE_KEY, {
          games,
          basedOnGenre: genre,
          fetchedAt: Date.now(),
          listsHash: newHash,
        } satisfies CachedRecommendations);

        if (mountedRef.current) {
          setRecommendedGames(games);
          setBasedOnGenre(genre);
          setLoading(false);
        }
      } catch (error) {
        logger.error("Error fetching recommended games:", error);
        if (mountedRef.current) setLoading(false);
      } finally {
        fetchingRef.current = false;
        // If state changed while fetching, process the latest signature.
        if (mountedRef.current) {
          const latest = getSignature();
          if (latest !== lastHashRef.current) {
            void handleHashReady(latest);
          }
        }
      }
    };

    const maybeReady = (): void => {
      if (!listsInitializedRef.current || !prefsInitializedRef.current) return;
      if (mountedRef.current) setLibraryReady(true);
      void handleHashReady(getSignature());
    };

    /** Called once all 3 initial list snapshots have been received. */
    function onListsInitialReady(): void {
      listsInitializedRef.current = true;
      maybeReady();
    }

    /** Called when a library or prefs change fires after initialisation. */
    function onInputsChanged(): void {
      if (!listsInitializedRef.current || !prefsInitializedRef.current) return;

      const newHash = getSignature();
      if (newHash === lastHashRef.current) return; // no actual change

      storageDelete(RECOMMENDED_GAMES_CACHE_KEY); // invalidate immediately
      void handleHashReady(newHash);
    }

    /**
     * Wires one library list to the shared refs. `keepDocs` mirrors the original
     * behaviour: only `playing` and `played` feed the ranking, so `wantToPlay`
     * is tracked by id alone.
     */
    const subscribeToList = (
      listId: LibraryListId,
      keepDocs: boolean,
    ): (() => void) => {
      let isInitial = true;

      return listsRef
        .doc(listId)
        .collection("games")
        .onSnapshot((snap) => {
          const listGames = snap.docs.map((doc) => doc.data() as UserListGameDoc);
          idsRef.current[listId] = listGames.map((game) => game.id);
          if (keepDocs && listId !== "wantToPlay") {
            docsRef.current[listId] = listGames;
          }
          if (mountedRef.current) {
            setHasLibraryGames(hasAnyLibraryGame(idsRef.current));
          }

          if (!isInitial) {
            onInputsChanged();
            return;
          }

          isInitial = false;
          snapshotCountRef.current += 1;
          if (snapshotCountRef.current === LIBRARY_LIST_COUNT) onListsInitialReady();
        });
    };

    const unsubscribeUser = userRef.onSnapshot(
      (doc) => {
        const data = doc.data() as
          | { favoriteGenres?: unknown; preferredPlatforms?: unknown }
          | undefined;
        prefsRef.current = {
          favoriteGenres: Array.isArray(data?.favoriteGenres)
            ? data.favoriteGenres.filter((g): g is string => typeof g === "string")
            : [],
          preferredPlatforms: Array.isArray(data?.preferredPlatforms)
            ? data.preferredPlatforms.filter((p): p is string => typeof p === "string")
            : [],
        };

        if (!prefsInitializedRef.current) {
          prefsInitializedRef.current = true;
          maybeReady();
          return;
        }
        onInputsChanged();
      },
      (error) => {
        logger.warn("[useRecommendedGames] prefs snapshot error:", error);
        if (!prefsInitializedRef.current) {
          prefsInitializedRef.current = true;
          maybeReady();
        }
      },
    );

    const unsubscribers = [
      subscribeToList("playing", true),
      subscribeToList("played", true),
      subscribeToList("wantToPlay", false),
      unsubscribeUser,
    ];

    return () => {
      mountedRef.current = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return { recommendedGames, loading, basedOnGenre, hasLibraryGames, libraryReady };
}
