"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  Gamepad2,
  Search,
  Sliders,
  Calendar,
  Sparkles,
  Star,
  Flame,
  Trophy,
  History,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import { useLangStore } from "../../store/useLangStore";

import GameRow from "../../components/games/GameRow";
import NewsRow from "../../components/games/NewsRow";
import FreeGamesRow from "../../components/games/FreeGamesRow";

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

interface GamesClientProps {
  query: string;
  genre: string;
  platform: string;
  sort: string;
  isSearching: boolean;
  searchResults: Game[];
  freeGames: FreeGame[];
  popular: Game[];
  recentlyReleased: Game[];
  comingSoon: Game[];
  mostAnticipated: Game[];
  nostalgia: Game[];
  steamTopSellers: Game[];
  topRated: Game[];
  trendingMobile: Game[];
}

export default function GamesClient({
  query,
  genre,
  platform,
  sort,
  isSearching,
  searchResults,
  freeGames,
  popular,
  recentlyReleased,
  comingSoon,
  mostAnticipated,
  nostalgia,
  steamTopSellers,
  topRated,
  trendingMobile,
}: GamesClientProps) {
  const { t } = useLangStore();

  const genres = React.useMemo(() => [
    { value: "", label: t("games.filter.any") + " " + t("games.filter.genre") },
    { value: "rpg", label: t("games.filter.genres.rpg") },
    { value: "shooter", label: t("games.filter.genres.shooter") },
    { value: "fighting", label: t("games.filter.genres.fighting") },
    { value: "racing", label: t("games.filter.genres.racing") },
    { value: "strategy", label: t("games.filter.genres.strategy") },
    { value: "adventure", label: t("games.filter.genres.adventure") },
    { value: "indie", label: t("games.filter.genres.indie") },
  ], [t]);

  const platforms = React.useMemo(() => [
    {
      value: "",
      label: t("games.filter.any") + " " + t("games.filter.platform"),
    },
    { value: "pc", label: t("games.filter.platforms.pc") },
    { value: "ps5", label: t("games.filter.platforms.ps5") },
    { value: "xboxSeries", label: t("games.filter.platforms.xboxSeries") },
    { value: "switch", label: t("games.filter.platforms.switch") },
  ], [t]);

  const sortOptions = React.useMemo(() => [
    { value: "relevance", label: t("games.filter.sortOptions.relevance") },
    { value: "title", label: t("games.filter.sortOptions.title") },
    {
      value: "release_date",
      label: t("games.filter.sortOptions.release_date"),
    },
    { value: "rating", label: t("games.filter.sortOptions.rating") },
  ], [t]);

  return (
    <div className="min-h-screen flex flex-col text-white">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Games Directory Header */}
        <div className="glass-panel border border-white/10 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-light-blue/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-light-blue to-secondary-blue rounded-2xl text-white">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-light-blue bg-clip-text text-transparent">
                {t("games.header")}
              </h1>
            </div>
          </div>

          {/* Form wrapper for full Server Side search submission */}
          <form
            method="GET"
            action="/games"
            className="flex flex-col sm:flex-row gap-3 w-full md:max-w-xl"
          >
            <div className="relative flex-grow">
              <input
                type="text"
                name="query"
                id="game-search-input"
                defaultValue={query}
                placeholder={t("games.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-light-blue transition-colors text-sm"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            </div>
            <button
              type="submit"
              id="game-search-submit"
              className="px-6 py-3 bg-gradient-to-r from-secondary-blue to-light-blue rounded-2xl font-extrabold text-sm hover:opacity-95 shadow-md shadow-light-blue/15 active:scale-95 transition-all"
            >
              <Search className="w-4 h-4 inline-block sm:hidden" />
              <span className="hidden sm:inline-block">
                {t("games.search")}
              </span>
            </button>
          </form>
        </div>

        {/* Filter Toolbar */}
        <form
          method="GET"
          action="/games"
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/5 border border-white/5 p-4 rounded-2xl items-center"
        >
          {/* Hidden input to preserve active text query */}
          {query && <input type="hidden" name="query" value={query} />}

          {/* Genre select */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">
              {t("games.filter.genre")}
            </label>
            <select
              name="genre"
              id="game-filter-genre"
              defaultValue={genre}
              className="w-full p-2.5 bg-dark-bg border border-white/10 rounded-xl text-xs focus:outline-none focus:border-light-blue text-white"
            >
              {genres.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Platform select */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">
              {t("games.filter.platform")}
            </label>
            <select
              name="platform"
              id="game-filter-platform"
              defaultValue={platform}
              className="w-full p-2.5 bg-dark-bg border border-white/10 rounded-xl text-xs focus:outline-none focus:border-light-blue text-white"
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort select */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">
              {t("games.filter.sort")}
            </label>
            <select
              name="sort"
              id="game-filter-sort"
              defaultValue={sort}
              className="w-full p-2.5 bg-dark-bg border border-white/10 rounded-xl text-xs focus:outline-none focus:border-light-blue text-white"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Apply button */}
          <div className="pt-5 sm:pt-4">
            <button
              type="submit"
              id="game-filter-submit"
              className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Sliders className="w-4 h-4 text-light-blue" />
              <span>{t("games.filter.apply")}</span>
            </button>
          </div>
        </form>

        {/* Content Area */}
        {isSearching ? (
          // 1. Search Results Section
          <section className="space-y-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-light-blue bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-light-blue" />
              <span>
                {t("games.list.searchResults")} ({searchResults.length})
              </span>
            </h2>

            {searchResults.length === 0 ? (
              <div className="text-center py-20 text-gray-400 glass-panel border border-white/5 rounded-3xl">
                {t("games.list.noResults")}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {searchResults.map((game) => {
                  const rating = game.total_rating
                    ? Math.round(game.total_rating) / 10
                    : 0;
                  const cover = game.cover
                    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
                    : "/image-not-found.webp";
                  return (
                    <Link
                      key={game.id}
                      href={`/games/${game.id}`}
                      className="group flex flex-col rounded-2xl overflow-hidden glass-panel glass-panel-hover border border-white/10 relative p-3 gap-3 shadow-md"
                    >
                      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden">
                        <Image
                          src={cover}
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
            )}
          </section>
        ) : (
          // 2. Default Browse dashboard
          <div className="space-y-12">
            {/* Free Games Promo */}
            <FreeGamesRow games={freeGames as any} />

            <NewsRow
              title={t("games.list.gamesNews.title")}
              icon={<Newspaper className="w-5 h-5 text-light-blue" />}
            />

            {/* Popular Right Now */}
            <section className="space-y-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-light-blue fill-light-blue" />
                <span>{t("games.list.popular.title")}</span>
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar">
                {popular.map((game, index) => {
                  const rating = game.total_rating
                    ? Math.round(game.total_rating) / 10
                    : 0;
                  const cover = game.cover
                    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
                    : "/image-not-found.webp";
                  return (
                    <Link
                      key={game.id}
                      href={`/games/${game.id}`}
                      className="group flex-shrink-0 w-44 rounded-2xl overflow-hidden glass-panel glass-panel-hover border border-white/10 p-3 flex flex-col gap-3 shadow-md"
                    >
                      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden">
                        <Image
                          src={cover}
                          alt={game.name}
                          fill
                          sizes="150px"
                          className="object-cover"
                          unoptimized={!game.cover}
                        />
                        <span className="absolute top-2 left-2 bg-dark-bg/85 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-gray-300">
                          #{index + 1}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xs text-white group-hover:text-light-blue line-clamp-2 min-h-[32px] transition-colors leading-snug">
                        {game.name}
                      </h3>
                    </Link>
                  );
                })}
              </div>
            </section>

            <GameRow
              title={t("games.list.trendingMobile.title")}
              icon={<TrendingUp className="w-5 h-5 text-light-blue" />}
              games={trendingMobile}
            />

            <GameRow
              title={t("games.list.mostAnticipated.title")}
              icon={<Flame className="w-5 h-5 text-light-blue" />}
              games={mostAnticipated}
              showCountdown={true}
            />

            <GameRow
              title={t("games.list.steamTopSellers.title")}
              icon={<Sparkles className="w-5 h-5 text-light-blue" />}
              games={steamTopSellers}
            />

            {/* Recently Released & Coming Soon Grid Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recently Released */}
              <section className="space-y-5">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-light-blue" />
                  <span>{t("games.list.recentlyReleased.title")}</span>
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {recentlyReleased.slice(0, 4).map((game) => {
                    const cover = game.cover
                      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
                      : "/image-not-found.webp";
                    return (
                      <Link
                        key={game.id}
                        href={`/games/${game.id}`}
                        className="group flex gap-3 p-3 rounded-2xl glass-panel glass-panel-hover border border-white/10 shadow-sm"
                      >
                        <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={cover}
                            alt={game.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized={!game.cover}
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <h3 className="font-bold text-xs text-white group-hover:text-light-blue line-clamp-2 leading-tight transition-colors">
                            {game.name}
                          </h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Coming Soon */}
              <section className="space-y-5">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-light-blue" />
                  <span>{t("games.list.comingSoon.title")}</span>
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {comingSoon.slice(0, 4).map((game) => {
                    const cover = game.cover
                      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp`
                      : "/image-not-found.webp";
                    return (
                      <Link
                        key={game.id}
                        href={`/games/${game.id}`}
                        className="group flex gap-3 p-3 rounded-2xl glass-panel glass-panel-hover border border-white/10 shadow-sm"
                      >
                        <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={cover}
                            alt={game.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized={!game.cover}
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <h3 className="font-bold text-xs text-white group-hover:text-light-blue line-clamp-2 leading-tight transition-colors">
                            {game.name}
                          </h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>

            <GameRow
              title={t("games.list.nostalgiaCorner.title")}
              icon={<History className="w-5 h-5 text-light-blue" />}
              games={nostalgia}
            />

            <GameRow
              title={t("games.list.topRated.title")}
              icon={<Trophy className="w-5 h-5 text-light-blue" />}
              games={topRated}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
