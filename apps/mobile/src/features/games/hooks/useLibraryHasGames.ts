import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";

/**
 * The library lists the recommender actually reads. `wantToPlay` is excluded
 * on purpose: `buildRecommendations` only scores `playing` / `played`, so a
 * wishlist-only library can never produce a personalized rail.
 */
const LIBRARY_LISTS = ["playing", "played"] as const;
type LibraryListId = (typeof LIBRARY_LISTS)[number];

export type LibraryHasGamesState = {
  /** True when a list the recommender reads holds at least one game. */
  hasGames: boolean;
  /** True once both list snapshots have resolved (or no user). */
  ready: boolean;
};

/**
 * Lightweight watcher for "can the recommender produce a personalized rail?".
 *
 * Deliberately does **not** build recommendations — it only counts the two
 * list subcollections the build depends on. The discovery rail's data hook
 * stays in charge of the recommendation build, while the quick-action chip can
 * share this cheap signal to decide whether it should read "For You",
 * "Trending" or "Popular".
 */
export function useLibraryHasGames(): LibraryHasGamesState {
  const uid = useAuthStore((s) => s.user?.uid ?? "");
  const [hasGames, setHasGames] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      setHasGames(false);
      setReady(true);
      return;
    }

    let mounted = true;
    const counts: Record<LibraryListId, number> = {
      playing: 0,
      played: 0,
    };
    let resolvedLists = 0;

    const listsRef = firestore()
      .collection("users")
      .doc(uid)
      .collection("lists");

    const unsubscribers = LIBRARY_LISTS.map((listId) => {
      let initial = true;

      const markResolved = (): void => {
        if (!initial) return;
        initial = false;
        resolvedLists += 1;
        if (resolvedLists === LIBRARY_LISTS.length) setReady(true);
      };

      return listsRef
        .doc(listId)
        .collection("games")
        .onSnapshot(
          (snap) => {
            counts[listId] = snap.size;
            if (!mounted) return;
            setHasGames(counts.playing > 0 || counts.played > 0);
            markResolved();
          },
          (error) => {
            logger.error("[useLibraryHasGames] onSnapshot error:", error);
            markResolved();
          },
        );
    });

    return () => {
      mounted = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid]);

  return { hasGames, ready };
}
