import { Suspense } from "react";
import { GamesPageView, SearchResultsClient } from "@/features/games";
import { createLocalizedMetadata } from "@/lib/metadata";

export const generateMetadata = createLocalizedMetadata({
  path: "/games/search",
  en: {
    title: "Gaming Zone | Search Games",
    description:
      "Search the Gaming Zone game catalogue by name, genre, platform, and sort order.",
  },
  ar: {
    title: "Gaming Zone | ابحث عن الألعاب",
    description:
      "ابحث في كتالوج ألعاب Gaming Zone حسب الاسم والنوع والمنصة ورتيب النتائج.",
  },
  overrides: { robots: { index: false, follow: true } },
});

/**
 * `robots: noindex` alongside the canonical. Results pages are keyed on query
 * strings, so indexing them creates near-duplicate thin pages per filter
 * combination and dilutes the browse page. The canonical still points at itself
 * rather than /games, so any crawler that reaches it via a stale link
 * consolidates here instead of spreading across duplicates.
 */

/**
 * Static shell — this route no longer reads `searchParams`, so it is
 * prerendered once and served from the CDN for every query-page permutation
 * with zero function invocations. This was the single biggest Fluid Active-CPU
 * line item: results used to SSR per request, with searchGames deliberately
 * uncached (its key space is visitor-typed text, so caching would let anyone
 * mint permanent entries).
 *
 * The client slot reads the query string in the browser and calls the IGDB
 * proxy in @/features/games/services/api directly — secrets stay server-side
 * and the wrapper already guards against junk input.
 */
export default async function GamesSearchPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <GamesPageView
      locale={locale}
      searchPath={`/${locale}/games/search`}
      query=""
      genre=""
      platform=""
      sort=""
      page={1}
      isSearching={false}
      searchResults={[]}
      searchSlot={
        <Suspense fallback={null}>
          <SearchResultsClient
            locale={locale}
            searchPath={`/${locale}/games/search`}
          />
        </Suspense>
      }
      freeGames={[]}
      popular={[]}
      recentlyReleased={[]}
      comingSoon={[]}
      mostAnticipated={[]}
      nostalgia={[]}
      steamTopSellers={[]}
      topRated={[]}
      trendingMobile={[]}
    />
  );
}
