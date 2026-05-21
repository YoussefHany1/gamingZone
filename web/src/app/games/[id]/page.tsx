import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import GameDetailsClient from "../../../components/gameDetails/GameDetailsClient";
import axios from "axios";

interface Website {
  id: number;
  type: number;
  url: string;
}

interface Company {
  id: number;
  name: string;
}

interface InvolvedCompany {
  id: number;
  developer: boolean;
  publisher: boolean;
  company: Company;
}

interface CollectionGame {
  id: number;
  name: string;
  cover?: { image_id: string };
}

interface SimilarGame {
  id: number;
  name: string;
  cover?: { image_id: string };
}

interface GameData {
  id: number;
  name: string;
  summary?: string;
  cover?: { image_id: string };
  total_rating?: number;
  total_rating_count?: number;
  release_dates?: { human?: string }[];
  platforms?: { id: number; name: string; abbreviation?: string }[];
  genres?: { id: number; name: string }[];
  game_modes?: { id: number; name: string }[];
  age_ratings?: { organization: number; rating_category: number }[];
  involved_companies?: InvolvedCompany[];
  game_engines?: { id: number; name: string }[];
  videos?: { name?: string; video_id: string }[];
  screenshots?: { image_id: string }[];
  language_supports?: {
    language: { name: string };
    language_support_type: { name: string };
  }[];
  game_time_to_beats?: {
    hastily?: number;
    normally?: number;
    completely?: number;
  };
  websites?: Website[];
  collections?: { games?: CollectionGame[] }[];
  similar_games?: SimilarGame[];
}

const SERVER_URL = "https://igdb-api-omega.vercel.app";

function extractSteamAppId(websites?: Website[]): string | null {
  if (!websites) return null;
  const steamSite = websites.find((w) => w.type === 13);
  if (!steamSite) return null;
  const match = steamSite.url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? match[1] : null;
}

function parseSpecHtml(html: string) {
  const stripped = html.replace(/<[^>]+>/g, (tag) => {
    const lower = tag.toLowerCase();
    if (lower.startsWith("</li")) return "\n";
    if (lower.startsWith("<br")) return "\n";
    return "";
  });
  const rows: { label: string; value: string }[] = [];
  stripped.split("\n").forEach((line) => {
    const clean = line
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!clean) return;
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0) {
      const label = clean
        .slice(0, colonIdx)
        .replace(/\s*\*$/, "")
        .trim();
      const value = clean.slice(colonIdx + 1).trim();
      if (label && value && !/additional/i.test(label))
        rows.push({ label, value });
    }
  });
  return rows;
}

async function fetchSteamRequirements(appId: string) {
  try {
    const res = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { timeout: 5000 },
    );
    const data = res.data?.[appId];
    if (!data?.success || !data?.data?.pc_requirements) return null;
    const reqs = data.data.pc_requirements;
    return {
      minimum: reqs.minimum ? parseSpecHtml(reqs.minimum) : [],
      recommended: reqs.recommended ? parseSpecHtml(reqs.recommended) : [],
    };
  } catch {
    return null;
  }
}

async function fetchGameDetails(id: string): Promise<GameData | null> {
  try {
    const res = await axios.get<GameData>(`${SERVER_URL}/game-details`, {
      params: { id },
      timeout: 8000,
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const id = params.id;

  const game = await fetchGameDetails(id);
  if (!game) {
    return { title: "تفاصيل اللعبة | Gaming Zone" };
  }

  const coverUrl = game.cover
    ? `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${game.cover.image_id}.webp`
    : "https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc8z2q.webp";

  return {
    title: `${game.name} | Gaming Zone`,
    description: game.summary || "اقرأ مراجعة وتفاصيل ومواصفات تشغيل اللعبة.",
    openGraph: {
      title: game.name,
      description: game.summary || "تفاصيل اللعبة ومواصفات تشغيلها.",
      images: [{ url: coverUrl, alt: game.name }],
      type: "video.other",
      siteName: "Gaming Zone",
    },
  };
}

export default async function GameDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const id = params.id;

  const game = await fetchGameDetails(id);

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col text-white">
        <Header />
        <main className="flex-grow flex flex-col justify-center items-center py-20 text-center">
          <h2 className="text-xl font-bold text-gray-400">
            حدث خطأ أثناء تحميل تفاصيل اللعبة
          </h2>
          <Link
            href="/games"
            className="mt-4 px-5 py-2.5 bg-light-blue rounded-xl text-sm font-semibold"
          >
            العودة للألعاب
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const coverUrl = game.cover
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
    : "/placeholder-news.jpg";

  const rating = game.total_rating ? Math.round(game.total_rating) / 10 : 0;

  const playTime = game.game_time_to_beats
    ? {
        main: game.game_time_to_beats.hastily
          ? Math.floor(game.game_time_to_beats.hastily / 3600)
          : null,
        mainExtra: game.game_time_to_beats.normally
          ? Math.floor(game.game_time_to_beats.normally / 3600)
          : null,
        completionist: game.game_time_to_beats.completely
          ? Math.floor(game.game_time_to_beats.completely / 3600)
          : null,
      }
    : null;

  // Transform language supports list
  const languageSupports = game.language_supports || [];
  const languageMap: Record<
    string,
    { Audio: boolean; Subtitles: boolean; Interface: boolean }
  > = {};

  languageSupports.forEach((sup) => {
    if (!sup.language || !sup.language_support_type) return;
    const langName = sup.language.name;
    const supportTypeName = sup.language_support_type.name;

    if (!languageMap[langName]) {
      languageMap[langName] = {
        Audio: false,
        Subtitles: false,
        Interface: false,
      };
    }

    if (supportTypeName === "Audio") languageMap[langName].Audio = true;
    if (supportTypeName === "Subtitles") languageMap[langName].Subtitles = true;
    if (supportTypeName === "Interface") languageMap[langName].Interface = true;
  });

  const languageRows = Object.entries(languageMap)
    .map(([name, supports]) => ({
      name,
      ...supports,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Extract Steam specifications
  const steamAppId = extractSteamAppId(game.websites);
  const pcSpecs = steamAppId ? await fetchSteamRequirements(steamAppId) : null;

  // Age rating info
  const esrbRating = game.age_ratings?.find((r) => r.organization === 2);
  const pegiRating = game.age_ratings?.find((r) => r.organization === 1);
  const activeAgeRating = esrbRating || pegiRating;

  // Map stores
  const storeMap = [
    {
      type: 10,
      name: "App Store",
      logo: "/assets/apple-store.webp",
      bg: "from-[#1852ef] to-[#12e6ff] border-[#12e6ff]/50 text-white",
    },
    {
      type: 12,
      name: "Play Store",
      logo: "/assets/play-store.webp",
      bg: "from-[#EA4335] to-[#FBBC04] border-white/50 text-white",
    },
    {
      type: 13,
      name: "Steam",
      logo: "/assets/steam.webp",
      bg: "from-[#000] to-[#1f94c0] border-[#102a54] text-white",
    },
    {
      type: 16,
      name: "Epic Games",
      logo: "/assets/epic-games.webp",
      bg: "from-[#1f1f1f] to-[#2a2a2a] border-white/5 text-white",
    },
    {
      type: 17,
      name: "GOG",
      logo: "/assets/gog.webp",
      bg: "from-[#2d1b4e] to-[#3f256e] border-[#5e38a3] text-white",
    },
    {
      type: 23,
      name: "PlayStation Store",
      logo: "/assets/playstation.webp",
      bg: "from-[#001033] to-[#003087] border-[#00379b] text-white",
    },
    {
      type: 22,
      name: "Xbox Store",
      logo: "/assets/xbox.webp",
      bg: "from-[#052005] to-[#107c10] border-[#1a9a1a] text-white",
    },
    {
      type: 24,
      name: "Nintendo eShop",
      logo: "/assets/nintendo-switch.webp",
      bg: "from-[#330005] to-[#e7000a] border-[#ff1a2b] text-white",
    },
  ];

  const gameStores = (game.websites || [])
    .filter((w) => storeMap.some((sm) => sm.type === w.type))
    .map((w) => {
      const sm = storeMap.find((s) => s.type === w.type)!;
      return { ...w, ...sm };
    });

  return (
    <div className="min-h-screen flex flex-col text-white relative">
      <Header />

      <GameDetailsClient
        game={game}
        pcSpecs={pcSpecs}
        rating={rating}
        playTime={playTime}
        languageRows={languageRows}
        activeAgeRating={activeAgeRating}
        gameStores={gameStores}
        coverUrl={coverUrl}
      />

      <Footer />
    </div>
  );
}
