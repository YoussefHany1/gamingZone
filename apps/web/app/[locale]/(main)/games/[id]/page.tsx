import Link from "@/components/Link";
import { Metadata } from "next";
import GameDetailsClient from "@/features/gameDetails/components/GameDetailsClient";
import {
  fetchGameDetails,
  fetchSteamRequirements,
  extractSteamAppId,
} from "@/features/gameDetails/services/api";
import { fetchGamesList } from "@/features/games";
import {
  formatLanguageRows,
  formatPlayTime,
} from "@/features/gameDetails/utils";
import { storeMap } from "@/features/gameDetails/constants";
import { getTranslations } from "@/i18n/server";
import { getSiteBaseUrl } from "@/lib/metadata";

// Prerender popular game pages so they are served from the Vercel CDN instead
// of running a function (IGDB proxy + Steam scrape) on every request.
//
// Game data does drift (aggregate ratings, release dates, store availability),
// so these stay on a 1h window rather than the 6h used for news articles. The
// long windows elsewhere are safety nets; /api/revalidate shortens this on
// demand. 1h is a 6x cut in writes on the 20 prerendered game paths.
export const revalidate = 3600;

const PRERENDERED_GAME_LIMIT = 12;

export async function generateStaticParams() {
  try {
    const popular = await fetchGamesList("popular");
    const ids = [...new Set(popular.map((g) => g.id.toString()))].slice(
      0,
      PRERENDERED_GAME_LIMIT,
    );
    return ids.map((id) => ({ id }));
  } catch (error) {
    // Swallowing this degrades every game page to a cold dynamic render, so an
    // IGDB outage at build time silently converts the ISR budget into a
    // per-request invocation. Surface it in the build log.
    console.error(
      "[games/[id]] generateStaticParams failed — no game pages will be " +
        "prerendered and every game hit will run a function:",
      error,
    );
    return [];
  }
}

export async function generateMetadata(props: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { id, locale } = params;

  const game = await fetchGameDetails(id);
  if (!game) {
    return {
      title:
        locale === "en"
          ? "Game Details | Gaming Zone"
          : "تفاصيل اللعبة | Gaming Zone",
      icons: {
        icon: "/assets/icon.webp",
      },
    };
  }

  const coverUrl = game.cover
    ? `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${game.cover.image_id}.webp`
    : "/assets/cover2.png";

  const canonicalUrl = `${getSiteBaseUrl()}/${locale}/games/${id}`;

  return {
    title: `Gaming Zone | ${game.name}`,
    description:
      game.summary ||
      (locale === "en"
        ? "Read game review, details, and system requirements."
        : "اقرأ مراجعة وتفاصيل ومواصفات تشغيل اللعبة."),
    alternates: {
      canonical: canonicalUrl,
    },
    icons: {
      icon: "/assets/icon.webp",
    },
    openGraph: {
      title: game.name,
      description:
        game.summary ||
        (locale === "en"
          ? "Game details and system requirements."
          : "تفاصيل اللعبة ومواصفات تشغيلها."),
      images: [{ url: coverUrl, alt: game.name }],
      type: "video.other",
      siteName: "Gaming Zone",
    },
    twitter: {
      card: "summary_large_image",
      title: game.name,
      description:
        game.summary ||
        (locale === "en"
          ? "Game details and system requirements."
          : "تفاصيل اللعبة ومواصفات تشغيلها."),
      images: [coverUrl],
    },
  };
}

export default async function GameDetailsPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const { id, locale } = params;

  const game = await fetchGameDetails(id);

  if (!game) {
    const t = getTranslations(locale);
    return (
      <div className="w-full flex flex-col text-white">
        <main className="grow flex flex-col justify-center items-center py-20 text-center">
          <h2 className="text-xl font-bold text-gray-400">
            {t("auth.errors.general")}
          </h2>
          <Link
            href="/games"
            className="mt-4 px-5 py-2.5 bg-light-blue rounded-xl text-sm font-semibold"
          >
            {t("games.details.backToGames")}
          </Link>
        </main>
      </div>
    );
  }

  const coverUrl = game.cover
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
    : "/assets/image-not-found.webp";

  const rating = game.total_rating ? Math.round(game.total_rating) / 10 : 0;
  const playTime = formatPlayTime(game.game_time_to_beats);
  const languageRows = formatLanguageRows(game.language_supports || []);

  // Extract Steam specifications
  const steamAppId = extractSteamAppId(game.websites);
  const pcSpecs = steamAppId ? await fetchSteamRequirements(steamAppId) : null;

  // Age rating info
  const esrbRating = game.age_ratings?.find((r) => r.organization === 2);
  const pegiRating = game.age_ratings?.find((r) => r.organization === 1);
  const activeAgeRating = esrbRating || pegiRating;

  const gameStores = (game.websites || [])
    .filter((w) => storeMap.some((sm) => sm.type === w.type))
    .map((w) => {
      const sm = storeMap.find((s) => s.type === w.type)!;
      return { ...w, ...sm };
    });

  const baseUrl = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    description: game.summary || "",
    image: coverUrl,
    url: `${baseUrl}/${locale}/games/${id}`,
    genre: game.genres?.map((g) => g.name),
    gamePlatform: game.platforms?.map((p) => p.name),
    aggregateRating: game.total_rating
      ? {
          "@type": "AggregateRating",
          ratingValue: (game.total_rating / 10).toFixed(1),
          bestRating: "10",
          ratingCount: game.total_rating_count || 1,
        }
      : undefined,
  };

  return (
    <div className="w-full flex flex-col text-white relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
    </div>
  );
}
