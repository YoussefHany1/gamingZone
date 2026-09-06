import { useState, useEffect, useRef } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { createMMKV } from "react-native-mmkv";
import { fetchGameById, fetchGamesByIds } from "@/src/services/api/igdbApi";
import type { Game } from "@/src/types/sharedTypes";

// ─── Cache Setup ──────────────────────────────────────────────────────────────
const storage = createMMKV({ id: "recommended-games-cache" });
const CACHE_KEY = "recommended_games_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type ListIds = {
  playing: number[];
  played: number[];
  wantToPlay: number[];
};

type CachedRecommendations = {
  games: Game[];
  basedOnGenre: string | null;
  fetchedAt: number;
  listsHash: string;
};

/** Stable hash of all 3 list IDs — order-insensitive */
function computeListsHash({ playing, played, wantToPlay }: ListIds): string {
  const sort = (arr: number[]) => [...arr].sort((a, b) => a - b).join(",");
  return `${sort(playing)}|${sort(played)}|${sort(wantToPlay)}`;
}

function readCache(): CachedRecommendations | null {
  try {
    const raw = storage.getString(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedRecommendations) : null;
  } catch {
    return null;
  }
}

function writeCache(data: CachedRecommendations): void {
  try {
    storage.set(CACHE_KEY, JSON.stringify(data));
  } catch { /* ignore write errors */ }
}

function clearCache(): void {
  storage.remove(CACHE_KEY);
}

// ─── Core Fetch Logic ─────────────────────────────────────────────────────────
async function buildRecommendations(
  uid: string,
  ownedIds: { playing: Set<number>; played: Set<number>; wantToPlay: Set<number> },
  allUserGames: any[],
): Promise<{ games: Game[]; basedOnGenre: string | null }> {
  const db = firestore();

  // Fetch user platform preference
  const userDoc = await db.collection("users").doc(uid).get();
  let userPlatform: string | null = null;
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data?.platform) userPlatform = data.platform.toLowerCase();
  }

  const ownedGameIds = new Set<number>([
    ...ownedIds.playing,
    ...ownedIds.played,
    ...ownedIds.wantToPlay,
  ]);

  if (allUserGames.length === 0) return { games: [], basedOnGenre: null };

  // Sort by playtime then addedAt
  allUserGames.sort((a, b) => {
    const playA = a.steamPlaytimeForever || 0;
    const playB = b.steamPlaytimeForever || 0;
    if (playA !== playB) return playB - playA;
    const timeA = a.addedAt?.toMillis ? a.addedAt.toMillis() : 0;
    const timeB = b.addedAt?.toMillis ? b.addedAt.toMillis() : 0;
    return timeB - timeA;
  });

  const topGameIds = allUserGames.slice(0, 10).map((g) => g.id);
  const gamesDetails = await Promise.all(
    topGameIds.map((id) => fetchGameById(id).catch(() => null)),
  );

  const similarGameWeights: Record<number, number> = {};
  const similarGameIds = new Set<number>();
  const genreCounts: Record<string, number> = {};

  gamesDetails.forEach((details, index) => {
    if (!details) return;
    const sourceWeight = 10 - index;
    details.similar_games?.forEach((sg) => {
      if (!ownedGameIds.has(sg.id)) {
        similarGameIds.add(sg.id);
        similarGameWeights[sg.id] = (similarGameWeights[sg.id] || 0) + sourceWeight;
      }
    });
    details.genres?.forEach((genre) => {
      if (genre.name) genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
    });
  });

  if (similarGameIds.size === 0) return { games: [], basedOnGenre: null };

  const sortedGenres = Object.keys(genreCounts).sort(
    (a, b) => (genreCounts[b] || 0) - (genreCounts[a] || 0),
  );
  const top3Genres = sortedGenres.slice(0, 3);
  const basedOnGenre = top3Genres[0] ?? null;

  const idsToFetch = Array.from(similarGameIds)
    .sort((a, b) => (similarGameWeights[b] || 0) - (similarGameWeights[a] || 0))
    .slice(0, 40);

  let results = await fetchGamesByIds(idsToFetch);

  // Filter DLCs and by user platform
  results = results.filter((game) => {
    if ((game as any).category !== undefined && (game as any).category !== 0) return false;
    if (!userPlatform) return true;
    if (!game.platforms) return false;
    if (userPlatform === "playstation")
      return game.platforms.some(
        (p) =>
          p.name?.toLowerCase().includes("playstation") ||
          p.abbreviation?.toLowerCase().includes("ps"),
      );
    if (userPlatform === "xbox")
      return game.platforms.some((p) => p.name?.toLowerCase().includes("xbox"));
    if (userPlatform === "pc")
      return game.platforms.some(
        (p) =>
          p.name?.toLowerCase().includes("pc") ||
          p.name?.toLowerCase().includes("windows"),
      );
    return game.platforms.some(
      (p) =>
        p.name?.toLowerCase().includes(userPlatform!) ||
        p.abbreviation?.toLowerCase().includes(userPlatform!),
    );
  });

  // Smart scoring
  results.forEach((game) => {
    let score = game.total_rating || 50;
    const gameGenreNames = game.genres?.map((g) => g.name) ?? [];
    if (top3Genres[0] && gameGenreNames.includes(top3Genres[0])) score += 15;
    if (top3Genres[1] && gameGenreNames.includes(top3Genres[1])) score += 10;
    if (top3Genres[2] && gameGenreNames.includes(top3Genres[2])) score += 5;
    score += (similarGameWeights[game.id] || 0) * 2;
    (game as any)._smartScore = score;
  });

  results = results.filter((game) => ((game as any)._smartScore || 0) >= 60);
  results.sort((a, b) => ((b as any)._smartScore || 0) - ((a as any)._smartScore || 0));

  // Shuffle top 20 for diversity, return 10
  const top20 = results.slice(0, 20);
  for (let i = top20.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [top20[i], top20[j]] = [top20[j]!, top20[i]!];
  }

  return { games: top20.slice(0, 10), basedOnGenre };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useRecommendedGames() {
  const [recommendedGames, setRecommendedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [basedOnGenre, setBasedOnGenre] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);       // prevent concurrent fetches
  const initializedRef = useRef(false);    // all 3 initial snapshots received?
  const snapshotCountRef = useRef(0);      // how many initial snapshots fired
  const lastHashRef = useRef<string>("");  // last committed hash

  // Live list data coming from snapshots
  const idsRef = useRef<ListIds>({ playing: [], played: [], wantToPlay: [] });
  const docsRef = useRef<{
    playing: any[];
    played: any[];
  }>({ playing: [], played: [] });

  useEffect(() => {
    mountedRef.current = true;
    fetchingRef.current = false;
    initializedRef.current = false;
    snapshotCountRef.current = 0;
    lastHashRef.current = "";

    const uid = auth().currentUser?.uid;
    if (!uid) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    const db = firestore();
    const listsRef = db.collection("users").doc(uid).collection("lists");

    async function handleHashReady(newHash: string) {
      if (!mountedRef.current || fetchingRef.current) return;
      // Hash unchanged — no work needed
      if (newHash === lastHashRef.current) return;

      lastHashRef.current = newHash;

      // ── Check persistent cache ──────────────────────────────────────────
      const cached = readCache();
      const now = Date.now();

      if (
        cached &&
        cached.listsHash === newHash &&
        now - cached.fetchedAt < CACHE_TTL_MS
      ) {
        if (mountedRef.current) {
          setRecommendedGames(cached.games);
          setBasedOnGenre(cached.basedOnGenre);
          setLoading(false);
        }
        return;
      }

      // Cache miss or stale — fetch fresh data
      fetchingRef.current = true;
      if (mountedRef.current) setLoading(true);

      try {
        const ownedIds = {
          playing: new Set(idsRef.current.playing),
          played: new Set(idsRef.current.played),
          wantToPlay: new Set(idsRef.current.wantToPlay),
        };
        const allUserGames = [...docsRef.current.playing, ...docsRef.current.played];

        const { games, basedOnGenre: genre } = await buildRecommendations(
          uid!,
          ownedIds,
          allUserGames,
        );

        // Persist to cache with the current hash
        writeCache({ games, basedOnGenre: genre, fetchedAt: Date.now(), listsHash: newHash });

        if (mountedRef.current) {
          setRecommendedGames(games);
          setBasedOnGenre(genre);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching recommended games:", error);
        if (mountedRef.current) setLoading(false);
      } finally {
        fetchingRef.current = false;
      }
    }

    /** Called when all 3 initial snapshots have been received */
    function onInitialReady() {
      initializedRef.current = true;
      handleHashReady(computeListsHash(idsRef.current));
    }

    /** Called when a subsequent (change) snapshot fires after init */
    function onListChanged() {
      if (!initializedRef.current) return;
      const newHash = computeListsHash(idsRef.current);
      if (newHash === lastHashRef.current) return; // no actual change
      clearCache();                                 // invalidate immediately
      handleHashReady(newHash);
    }

    // ── Firestore onSnapshot listeners ─────────────────────────────────────
    let playingIsInitial = true;
    let playedIsInitial = true;
    let wantToPlayIsInitial = true;

    const unsubPlaying = listsRef
      .doc("playing")
      .collection("games")
      .onSnapshot((snap) => {
        idsRef.current.playing = snap.docs.map((d) => d.data().id as number);
        docsRef.current.playing = snap.docs.map((d) => d.data());
        if (playingIsInitial) {
          playingIsInitial = false;
          snapshotCountRef.current++;
          if (snapshotCountRef.current === 3) onInitialReady();
        } else {
          onListChanged();
        }
      });

    const unsubPlayed = listsRef
      .doc("played")
      .collection("games")
      .onSnapshot((snap) => {
        idsRef.current.played = snap.docs.map((d) => d.data().id as number);
        docsRef.current.played = snap.docs.map((d) => d.data());
        if (playedIsInitial) {
          playedIsInitial = false;
          snapshotCountRef.current++;
          if (snapshotCountRef.current === 3) onInitialReady();
        } else {
          onListChanged();
        }
      });

    const unsubWantToPlay = listsRef
      .doc("wantToPlay")
      .collection("games")
      .onSnapshot((snap) => {
        idsRef.current.wantToPlay = snap.docs.map((d) => d.data().id as number);
        if (wantToPlayIsInitial) {
          wantToPlayIsInitial = false;
          snapshotCountRef.current++;
          if (snapshotCountRef.current === 3) onInitialReady();
        } else {
          onListChanged();
        }
      });

    return () => {
      mountedRef.current = false;
      unsubPlaying();
      unsubPlayed();
      unsubWantToPlay();
    };
  }, []);

  return { recommendedGames, loading, basedOnGenre };
}
