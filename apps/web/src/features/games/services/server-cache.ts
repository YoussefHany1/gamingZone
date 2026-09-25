import "server-only";

import axios from "axios";
import { unstable_cache } from "next/cache";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Game, FreeGame } from "../types";
import { getServerApiUrl } from "@/lib/api-config";

/**
 * Server-side game list accessors, cached across requests.
 *
 * Split from ./api because GameSearchAutocomplete (a client component) imports
 * searchGames from there — `unstable_cache` and `server-only` cannot live in a
 * module that reaches the browser bundle.
 *
 * Why this matters: axios bypasses Next's fetch cache, and /[locale]/games
 * awaits searchParams, so that route is always a dynamic render. It was firing
 * nine of these calls on every visit. These wrappers collapse them to one
 * upstream request per TTL.
 *
 * TTLs are a fallback, not the freshness mechanism — /api/revalidate drops the
 * matching tags when content actually changes.
 */

const FREE_GAMES_LIMIT = 20;

/** Kept in step with games/[id]'s `revalidate` (3600). */
const GAMES_LIST_TTL_SECONDS = 3600;

/** Kept in step with the home page's `revalidate` (1800). */
const FREE_GAMES_TTL_SECONDS = 1800;

interface FreeGameDoc {
  $id: string;
  title: string;
  image?: string;
  store?: string;
  url?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchGamesList = async (endpoint: string): Promise<Game[]> =>
  unstable_cache(
    async () => {
      try {
        const res = await axios.get<Game[]>(`${getServerApiUrl()}/${endpoint}`, {
          timeout: 8000,
        });
        return Array.isArray(res.data) ? res.data : [];
      } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return [];
      }
    },
    ["games-list", endpoint],
    {
      revalidate: GAMES_LIST_TTL_SECONDS,
      tags: ["games", `games:${endpoint}`],
    },
  )();

export const fetchFreeGames = async (): Promise<FreeGame[]> =>
  unstable_cache(
    async () => {
      try {
        const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
        if (!DATABASE_ID) return [];

        const res = await databases.listDocuments(
          DATABASE_ID,
          "free_games",
          [Query.orderAsc("type"), Query.limit(FREE_GAMES_LIMIT)],
        );

        return (res.documents as unknown as FreeGameDoc[]).map((doc) => ({
          id: doc.$id,
          title: doc.title,
          image: doc.image,
          store: doc.store,
          url: doc.url,
          type: doc.type ?? "",
          startDate: doc.startDate,
          endDate: doc.endDate,
        }));
      } catch (error) {
        console.error("Error fetching free games from Appwrite:", error);
        return [];
      }
    },
    ["free-games"],
    {
      revalidate: FREE_GAMES_TTL_SECONDS,
      tags: ["games", "games:free-games"],
    },
  )();
