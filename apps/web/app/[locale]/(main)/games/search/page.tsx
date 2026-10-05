import { GamesPageView, searchGames } from "@/features/games";
import { createLocalizedMetadata } from "@/lib/metadata";

/**
 * Dynamic by design: this route reads `searchParams`, so Next renders it per
 * request and any `revalidate` export would be inert. This is the counterpart
 * to the static /[locale]/games browse page — search, filtering and pagination
 * were what previously forced that page dynamic and cost it a full ISR window.
 *
 * searchGames is deliberately uncached (see @/features/games/services/api). Its
 * key space is user-typed query text, so caching it would let anyone mint
 * permanent entries by typing, and IGDB search is cheap enough not to need a
 * cross-request cache.
 */
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
export default async function GamesSearchPage(props: {
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

  // Clamp rather than trust: this becomes an upstream query param. parseInt
  // returns NaN for junk, and an unbounded page number would ask IGDB for an
  // arbitrarily deep slice.
  const parsedPage = parseInt(searchParams.page || "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.min(Math.max(parsedPage, 1), 50) : 1;

  // Only treat it as a search when something was actually narrowed by, matching
  // the old `isSearching` check. A bare /games/search renders the same "no
  // results" empty state rather than a full-catalogue dump.
  const isSearching = query !== "" || genre !== "" || platform !== "";
  const searchResults = isSearching
    ? await searchGames(query, genre, platform, sort, page)
    : [];

  return (
    <GamesPageView
      locale={locale}
      searchPath={`/${locale}/games/search`}
      query={query}
      genre={genre}
      platform={platform}
      sort={sort}
      page={page}
      isSearching={isSearching}
      searchResults={searchResults}
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