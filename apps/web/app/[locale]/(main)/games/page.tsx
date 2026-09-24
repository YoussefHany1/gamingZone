import { GamesPageView, fetchFreeGames, fetchGamesList, searchGames, Game, FreeGame } from "@/features/games";
import { createLocalizedMetadata } from "@/lib/metadata";

export const revalidate = 600;

export const generateMetadata = createLocalizedMetadata({
  en: {
    title: "Gaming Zone | Games Directory & Your Library",
    description:
      "Search for your favorite games, discover free games of the week from Steam, Epic Games and GOG, rate popular video games, and organize your own game library.",
  },
  ar: {
    title: "Gaming Zone | دليل الألعاب والمنصات ومكتبتك الخاصة",
    description:
      "ابحث عن ألعابك المفضلة، اكتشف الألعاب المجانية للأسبوع من Steam، Epic Games و GOG، قيّم أشهر ألعاب الفيديو، ونظّم قوائم وألعابك الخاصة.",
  },
});

export default async function GamesPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    query?: string;
    genre?: string;
    platform?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const [{ locale }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

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
    <GamesPageView
      locale={locale}
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
