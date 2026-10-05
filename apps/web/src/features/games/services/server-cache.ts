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
 * Why this matters: axios bypasses Next's fetch cache, and both callers render
 * data that outlives a single request. /[locale]/games was previously forced
 * dynamic by an `await searchParams`, so it fired nine of these calls on every
 * visit. These wrappers collapse them to one upstream request per TTL.
 *
 * Now that search has moved to /[locale]/games/search, the browse page is a real
 * ISR route and the search route renders per request — but search goes through
 * searchGames in ./api, which is intentionally uncached, so the unbounded key
 * space of user-typed queries never reaches these accessors.
 */

const FREE_GAMES_LIMIT = 20;

/**
 * Both TTLs are 86400 because both feed the static /[locale]/games browse page,
 * whose own `revalidate` is also 86400.
 *
 * They must stay equal. Next derives a route's revalidate window from the
 * *lowest* TTL among the data-cache entries its render touches, so the browse
 * page is capped by whichever of these two is shorter — raising only one would
 * silently leave the page regenerating hourly while the comment above claims
 * it is a daily ISR route.
 *
 * free-games.yml calls /api/revalidate with target "games" whenever free-game
 * membership changes, dropping these tags and the browse paths ahead of the
 * window. The long TTL is a backstop; that trigger is the freshness mechanism.
 */
const GAMES_LIST_TTL_SECONDS = 86400;
const FREE_GAMES_TTL_SECONDS = 86400;

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
