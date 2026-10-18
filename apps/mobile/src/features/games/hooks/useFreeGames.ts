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

/**
 * Free games for the games feed's `free_games` section.
 *
 * Phase 3 migration of the legacy `gamesScreen/FreeGames.tsx`: the fetching
 * policy (cache key + Appwrite query + document mapping) lives here; the
 * section owns only what to render. Unlike every sibling rail (IGDB
 * `Game[]`), this one is Appwrite-backed and therefore passes its own
 * payload type to the shared `useSectionFeed`.
 */
export function useFreeGames() {
  return useSectionFeed<FreeGameItem>(STORAGE_KEY, fetchFreeGamesFromAppwrite);
}
