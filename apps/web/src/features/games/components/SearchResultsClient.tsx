"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Sparkles, Star } from "lucide-react";
import { createTranslator } from "@/i18n/translate";
import { searchGames } from "../services/api";
import { Game } from "../types";
import { gameCoverUrl } from "../utils";

interface SearchResultsClientProps {
  locale: string;
  /** Locale-prefixed path the pagination links and filter form submit to. */
  searchPath: string;
}

interface PageState {
  query: string;
  genre: string;
  platform: string;
  sort: string;
  page: number;
}

/**
 * Locale-prefixed pagination href. These are full-page navigations on purpose:
 * the route is a static shell, so every URL (including ?page=) is served from
 * the Vercel CDN with zero function invocations, and this component re-runs the
 * query in the browser after hydration. Client-side router pushes would fire an
 * RSC request per URL — navigation history still works through the full load.
 */
function buildPageHref(
  state: Omit<PageState, "page">,
  searchPath: string,
  page: number,
): string {
  const params = new URLSearchParams();
  if (state.query) params.set("query", state.query);
  if (state.genre) params.set("genre", state.genre);
  if (state.platform) params.set("platform", state.platform);
  if (state.sort) params.set("sort", state.sort);
  params.set("page", String(page));
  return `${searchPath}?${params.toString()}`;
}

/**
 * Client results area for /games/search.
 *
 * The route used to SSR results for every query-page permutation, which was the
 * single biggest Fluid Active-CPU line item (uncached, visitor-typed query
 * space). The page is now a static shell; this component reads the query string
 * and calls the Cloud Run IGDB proxy directly via searchGames, so Vercel burns
 * nothing per search. The backend keeps its own s-maxage Cache-Control header
 * and all IGDB credentials — no secrets move client-side.
 */
export default function SearchResultsClient({
  locale,
  searchPath,
}: SearchResultsClientProps) {
  const t = createTranslator(locale);
  const searchParams = useSearchParams();

  const query = searchParams.get("query") || "";
  const genre = searchParams.get("genre") || "";
  const platform = searchParams.get("platform") || "";
  const sort = searchParams.get("sort") || "relevance";

  // Clamp rather than trust: page becomes an upstream paging offset.
  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const page =
    Number.isFinite(parsedPage) ? Math.min(Math.max(parsedPage, 1), 50) : 1;

  const isSearching = query !== "" || genre !== "" || platform !== "";

  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSearching) return;

    let isCancelled = false;
    setLoading(true);

    searchGames(query, genre, platform, sort, page)
      .then((games) => {
        if (!isCancelled) setResults(games);
      })
      .catch((error) => console.error("Error searching games:", error))
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, genre, platform, sort, page]);

  if (!isSearching) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold bg-linear-to-r from-white to-light-blue bg-clip-text text-transparent flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-light-blue" />
        <span>
          {loading
            ? t("games.list.searchResults") + "…"
            : `${t("games.list.searchResults")} (${results.length})`}
        </span>
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-3/4 rounded-2xl glass-panel border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-gray-400 glass-panel border border-white/5 rounded-3xl">
          {t("games.list.noResults")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {results.map((game) => {
              const rating = game.total_rating
                ? Math.round(game.total_rating) / 10
                : 0;
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="group flex flex-col rounded-2xl overflow-hidden glass-panel glass-panel-hover border border-white/10 relative p-3 gap-3 shadow-md"
                >
                  <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden">
                    <Image
                      src={gameCoverUrl(game)}
                      alt={game.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 150px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={!game.cover}
                    />
                    {rating > 0 && (
                      <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-dark-bg/85 border border-white/10 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-yellow-400">
                        <Star className="w-3 h-3 fill-yellow-400" />
                        <span>{rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-xs text-white group-hover:text-light-blue line-clamp-2 transition-colors min-h-[32px] leading-snug">
                    {game.name}
                  </h3>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {results.length > 0 && (
            <div className="flex justify-center items-center gap-4 pt-8 pb-4">
              <SearchPager
                page={page}
                query={query}
                genre={genre}
                platform={platform}
                sort={sort}
                count={results.length}
                searchPath={searchPath}
                locale={locale}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface SearchPagerProps {
  page: number;
  query: string;
  genre: string;
  platform: string;
  sort: string;
  count: number;
  searchPath: string;
  locale: string;
}

/**
 * Splits the pager markup out so the disabled first-page button reacts to the
 * same href builder without duplicating it inline in the grid component.
 */
function SearchPager(props: SearchPagerProps) {
  const { page, count, searchPath, locale, query, genre, platform, sort } =
    props;
  const t = createTranslator(locale);
  const state = { query, genre, platform, sort };

  return (
    <>
      {page > 1 ? (
        <Link
          href={buildPageHref(state, searchPath, page - 1)}
          className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-sm font-bold rounded-xl flex items-center gap-2 transition-all"
        >
          <span>{t("common.previous") || "Previous"}</span>
        </Link>
      ) : (
        <button
          disabled
          className="px-6 py-2.5 bg-white/5 border border-white/5 text-gray-500 text-sm font-bold rounded-xl flex items-center gap-2 cursor-not-allowed"
        >
          <span>{t("common.previous") || "Previous"}</span>
        </button>
      )}

      <span className="text-sm font-bold text-gray-300">{page}</span>

      {count === 50 ? (
        <Link
          href={buildPageHref(state, searchPath, page + 1)}
          className="px-6 py-2.5 bg-linear-to-r from-secondary-blue to-light-blue text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-md shadow-light-blue/15 hover:opacity-95 active:scale-95 transition-all"
        >
          <span>{t("common.next") || "Next"}</span>
        </Link>
      ) : (
        <button
          disabled
          className="px-6 py-2.5 bg-white/5 border border-white/5 text-gray-500 text-sm font-bold rounded-xl flex items-center gap-2 cursor-not-allowed"
        >
          <span>{t("common.next") || "Next"}</span>
        </button>
      )}
    </>
  );
}
