import { useMemo } from "react";
import Constants from "expo-constants";
import { Query } from "react-native-appwrite";
import { useSectionFeed } from "./useSectionFeed";
import { databases } from "@/src/lib/appwrite";
import type { FreeGameItem } from "../types";

/**
 * The cache key for the free-games feed section.
 *
 * Load-bearing AND easily mistaken: this is the key the legacy section
 * actually used — "FREE_GAMES_APPWRITE_CACHE" — even though the legacy
 * file also declared a dead `GAMES_CACHE_FREE_GAMES` const it never
 * referenced. The const is dead weight and is NOT ported; the live key
 * below stays byte-identical so a warm cache survives the migration.
 */
const STORAGE_KEY = "FREE_GAMES_APPWRITE_CACHE";

const FREE_GAMES_COLLECTION_ID = "free_games";

const dbId = Constants.expoConfig?.extra?.APPWRITE_DATABASE_ID as string;

const fetchFreeGamesFromAppwrite = async (): Promise<FreeGameItem[]> => {
  const response = await databases.listDocuments(dbId, FREE_GAMES_COLLECTION_ID, [
    Query.orderAsc("type"),
    Query.limit(20),
  ]);

  return response.documents.map((doc) => ({
    id: doc.$id,
    title: doc.title as string,
    image: doc.image as string | undefined,
    slug: doc.slug as string | undefined,
    store: doc.store as string | undefined,
    url: doc.url as string | undefined,
    description: doc.description as string | undefined,
    type: doc.type as string,
    startDate: doc.startDate as string | number | undefined,
    endDate: doc.endDate as string | number | undefined,
    igdb_game_id: doc.igdb_game_id as number | undefined,
  }));
};

function matchesPreferredPlatforms(item: FreeGameItem, preferredPlatforms?: string[]): boolean {
  if (!preferredPlatforms || preferredPlatforms.length === 0) return true;
  const store = (item.store ?? "").toLowerCase();
  // Best-effort mapping: current giveaways are primarily PC storefronts.
  const pcStores = ["steam", "epic", "gog", "pc"];
  const wantsPc = preferredPlatforms.includes("pc");
  const wantsOtherConsole = preferredPlatforms.some((p) => p !== "pc" && p !== "mobile");
  if (wantsPc && pcStores.some((s) => store.includes(s))) return true;
  // If user only selected non-PC platforms, keep PC giveaways visible as general deals.
  if (!wantsPc && wantsOtherConsole) return true;
  // Mobile giveaways are rare; if explicitly selected, don't hide PC deals either.
  if (preferredPlatforms.includes("mobile")) return true;
  return false;
}

/**
 * Free games for the games feed's `free_games` section.
 *
 * Phase 3 migration of the legacy `gamesScreen/FreeGames.tsx`: the fetching
 * policy (cache key + Appwrite query + document mapping) lives here; the
 * section owns only what to render. Unlike every sibling rail (IGDB
 * `Game[]`), this one is Appwrite-backed and therefore passes its own
 * payload type to the shared `useSectionFeed`.
 */
export function useFreeGames(preferredPlatforms?: string[]) {
  const state = useSectionFeed<FreeGameItem>(STORAGE_KEY, fetchFreeGamesFromAppwrite);
  const filtered = useMemo(() => {
    if (!state.games) return state.games;
    const out = state.games.filter((g) => matchesPreferredPlatforms(g, preferredPlatforms));
    // Never hide all deals due to uncertain mapping.
    return out.length > 0 ? out : state.games;
  }, [state.games, preferredPlatforms]);
  return { ...state, games: filtered };
}
