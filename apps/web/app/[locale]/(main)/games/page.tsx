import { GamesPageView, fetchFreeGames, fetchGamesList } from "@/features/games";
import { createLocalizedMetadata } from "@/lib/metadata";

/**
 * 24h ISR window. This was previously `600`, which was inert — the route awaited
 * `searchParams`, so Next always rendered it dynamically and the export had no
 * effect. Search now lives at /[locale]/games/search, which is the dynamic
 * route; this one is a pure browse page and is actually static.
 *
 * Freshness is pure ISR: free-game membership changes age into the page as the
 * window lapses. The window is the freshness mechanism.
 *
 * Both TTLs in @/features/games/services/server-cache are also 86400 and must
 * stay in step: Next takes the lowest TTL among the data-cache entries a render
 * touches, so a lower one here would silently keep this page dynamic-ish.
 */
export const revalidate = 86400;

export const generateMetadata = createLocalizedMetadata({
  path: "/games",
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

/**
 * Browse only. Deliberately does NOT read `searchParams` — awaiting it is what
 * forced this route to be a dynamic render. Search, filtering and pagination
 * live at /[locale]/games/search.
 *
 * Trade-off: an old bookmark like /en/games?query=zelda no longer filters, it
 * just lands here on the browse page. That was accepted rather than adding a
 * redirect, since the search results page is `noindex` anyway and these query
 * URLs were never canonical.
 */
export default async function GamesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  // Nine cached accessors; each collapses to one upstream request per TTL.
  const [
    freeGames,
    popular,
    recentlyReleased,
    comingSoon,
    mostAnticipated,
    nostalgia,
    steamTopSellers,
    topRated,
    trendingMobile,
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

  return (
    <GamesPageView
      locale={locale}
      searchPath={`/${locale}/games/search`}
      query=""
      genre=""
      platform=""
      sort="relevance"
      page={1}
      isSearching={false}
      searchResults={[]}
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
