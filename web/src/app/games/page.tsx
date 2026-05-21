import GamesClient from "./GamesClient";
import axios from "axios";
import { databases } from "../../lib/appwrite";
import { Query } from "appwrite";
import { Metadata } from "next";

interface Game {
  id: number;
  name: string;
  cover?: { image_id: string };
  total_rating?: number;
  game_type?: number;
  first_release_date?: number;
}

interface FreeGame {
  id: string;
  title: string;
  image?: string;
  store?: string;
  url?: string;
  type: string;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api` : "http://localhost:3000/api");

async function fetchGamesList(endpoint: string): Promise<Game[]> {
  try {
    const res = await axios.get<Game[]>(`${SERVER_URL}/${endpoint}`, {
      timeout: 8000,
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return [];
  }
}

async function fetchFreeGames(): Promise<any[]> {
  try {
    const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
    const COLLECTION_ID = "free_games";
    if (!DATABASE_ID) return [];

    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.orderAsc("type"),
      Query.limit(20),
    ]);

    return res.documents.map((doc) => ({
      id: doc.$id,
      title: doc.title,
      image: doc.image,
      store: doc.store,
      url: doc.url,
      type: doc.type,
      startDate: doc.startDate,
      endDate: doc.endDate,
    }));
  } catch (error) {
    console.error("Error fetching free games from Appwrite:", error);
    return [];
  }
}

async function searchGames(
  query: string,
  genre: string,
  platform: string,
  sort: string,
): Promise<Game[]> {
  try {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (genre) params.genre = genre;
    if (platform) params.platform = platform;
    if (sort) params.sort = sort;

    const res = await axios.get<Game[]>(`${SERVER_URL}/search`, {
      params,
      timeout: 10000,
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error searching games:", error);
    return [];
  }
}

export const metadata: Metadata = {
  title: "دليل الألعاب والمنصات ومكتبتك الخاصة | Gaming Zone",
  description:
    "ابحث عن ألعابك المفضلة، اكتشف الألعاب المجانية للأسبوع من Steam و Epic Games، قيّم أشهر ألعاب الفيديو، ونظّم قوائم ومكتبة ألعابك الخاصة.",
  openGraph: {
    title: "دليل الألعاب والمنصات ومكتبتك الخاصة | Gaming Zone",
    description:
      "ابحث عن ألعابك المفضلة، اكتشف الألعاب المجانية للأسبوع من Steam & Epic Games، قيّم أشهر ألعاب الفيديو، ونظّم قوائم ومكتبة ألعابك الخاصة.",
    images: [
      {
        url: "/assets/cover2.png",
        width: 1024,
        height: 500,
        alt: "Gaming Zone Banner",
      },
    ],
    siteName: "Gaming Zone",
    type: "website",
  },
};

export default async function GamesPage(props: {
  searchParams: Promise<{
    query?: string;
    genre?: string;
    platform?: string;
    sort?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.query || "";
  const genre = searchParams.genre || "";
  const platform = searchParams.platform || "";
  const sort = searchParams.sort || "relevance";

  const isSearching = query !== "" || genre !== "" || platform !== "";

  // Data fetching based on search mode
  let searchResults: Game[] = [];
  let freeGames: FreeGame[] = [];
  let popular: Game[] = [];
  let recentlyReleased: Game[] = [];
  let comingSoon: Game[] = [];

  let mostAnticipated: Game[] = [];
  let nostalgia: Game[] = [];
  let steamTopSellers: Game[] = [];
  let topRated: Game[] = [];
  let trendingMobile: Game[] = [];

  if (isSearching) {
    searchResults = await searchGames(query, genre, platform, sort);
  } else {
    // parallel fetch in Server Component
    const [
      freeRes,
      popRes,
      recentRes,
      upcomingRes,
      anticipatedRes,
      nostalgiaRes,
      steamRes,
      topRatedRes,
      trendingMobileRes,
    ] = await Promise.all([
      fetchFreeGames(),
      fetchGamesList("popular"),
      fetchGamesList("recently-released"),
      fetchGamesList("coming-soon"),
      fetchGamesList("most-anticipated"),
      fetchGamesList("nostalgia-corner"),
      fetchGamesList("steam-top-sellers"),
      fetchGamesList("top-rated"),
      fetchGamesList("trending-mobile"),
    ]);
    freeGames = freeRes;
    popular = popRes;
    recentlyReleased = recentRes;
    comingSoon = upcomingRes;
    mostAnticipated = anticipatedRes;
    nostalgia = nostalgiaRes;
    steamTopSellers = steamRes;
    topRated = topRatedRes;
    trendingMobile = trendingMobileRes;
  }

  return (
    <GamesClient
      query={query}
      genre={genre}
      platform={platform}
      sort={sort}
      isSearching={isSearching}
      searchResults={searchResults}
      freeGames={freeGames}
      popular={popular}
      recentlyReleased={recentlyReleased}
      comingSoon={comingSoon}
      mostAnticipated={mostAnticipated}
      nostalgia={nostalgia}
      steamTopSellers={steamTopSellers}
      topRated={topRated}
      trendingMobile={trendingMobile}
    />
  );
}
