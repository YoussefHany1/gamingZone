import { useEffect, useRef, useState } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { storageDelete, storageGet, storageSet } from "@/src/lib/storage";
import type { Game } from "@/src/types/sharedTypes";
import {
  RECOMMENDED_GAMES_CACHE_KEY,
  isRecommendedGamesCacheFresh,
  recommendedGamesListHash,
  type CachedRecommendations,
  type RecommendedGamesListIds,
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

export type RecommendedGamesState = {
  recommendedGames: Game[];
  loading: boolean;
  basedOnGenre: string | null;
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

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false); // prevent concurrent fetches
  const initializedRef = useRef(false); // have all 3 initial snapshots arrived?
  const snapshotCountRef = useRef(0); // how many initial snapshots have fired
  const lastHashRef = useRef(""); // last committed hash

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

  useEffect(() => {
    mountedRef.current = true;
    fetchingRef.current = false;
    initializedRef.current = false;
    snapshotCountRef.current = 0;
    lastHashRef.current = "";

    const uid = auth().currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const listsRef = firestore().collection("users").doc(uid).collection("lists");

    /** Serves the cache when it still matches the library, else rebuilds it. */
    const handleHashReady = async (newHash: string): Promise<void> => {
      if (!mountedRef.current || fetchingRef.current) return;
      // Hash unchanged — no work needed.
      if (newHash === lastHashRef.current) return;

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
      }
    };

    /** Called once all 3 initial snapshots have been received. */
    function onInitialReady(): void {
      initializedRef.current = true;
      void handleHashReady(recommendedGamesListHash(idsRef.current));
    }

    /** Called when a change snapshot fires after initialisation. */
    function onListChanged(): void {
      if (!initializedRef.current) return;

      const newHash = recommendedGamesListHash(idsRef.current);
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

          if (!isInitial) {
            onListChanged();
            return;
          }

          isInitial = false;
          snapshotCountRef.current += 1;
          if (snapshotCountRef.current === LIBRARY_LIST_COUNT) onInitialReady();
        });
    };

    const unsubscribers = [
      subscribeToList("playing", true),
      subscribeToList("played", true),
      subscribeToList("wantToPlay", false),
    ];

    return () => {
      mountedRef.current = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return { recommendedGames, loading, basedOnGenre };
}
