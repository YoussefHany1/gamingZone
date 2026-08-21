import { GamesClient, fetchFreeGames, fetchGamesList, searchGames, Game, FreeGame } from "@/features/games";
import { Metadata } from "next";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (locale === "en") {
    return {
      title: "Gaming Zone | Games Directory & Your Library",
      description:
        "Search for your favorite games, discover free games of the week from Steam, Epic Games and GOG, rate popular video games, and organize your own game library.",
      icons: {
        icon: "/assets/icon.webp",
      },
      openGraph: {
        title: "Gaming Zone | Games Directory & Your Library",
        description:
          "Search for your favorite games, discover free games of the week from Steam, Epic Games and GOG, rate popular video games, and organize your own game library.",
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
  }

  return {
    title: "Gaming Zone | دليل الألعاب والمنصات ومكتبتك الخاصة",
    description:
      "ابحث عن ألعابك المفضلة، اكتشف الألعاب المجانية للأسبوع من Steam، Epic Games و GOG، قيّم أشهر ألعاب الفيديو، ونظّم قوائم وألعابك الخاصة.",
    icons: {
      icon: "/assets/icon.webp",
    },
    openGraph: {
      title: "Gaming Zone | دليل الألعاب والمنصات ومكتبتك الخاصة",
      description:
        "ابحث عن ألعابك المفضلة، اكتشف الألعاب المجانية للأسبوع من Steam، Epic Games و GOG، قيّم أشهر ألعاب الفيديو، ونظّم قوائم وألعابك الخاصة.",
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
}

export default async function GamesPage(props: {
  searchParams: Promise<{
    query?: string;
    genre?: string;
    platform?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.query || "";
  const genre = searchParams.genre || "";
  const platform = searchParams.platform || "";
  const sort = searchParams.sort || "relevance";
  const page = parseInt(searchParams.page || "1", 10) || 1;

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
    searchResults = await searchGames(query, genre, platform, sort, page);
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
      page={page}
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
