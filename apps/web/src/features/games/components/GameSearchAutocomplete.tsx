"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import Link from "@/components/Link";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";
import { searchGames } from "../services/api";
import { Game } from "../types";

interface GameSearchAutocompleteProps {
  initialQuery: string;
  placeholder: string;
  submitText: string;
}

export default function GameSearchAutocomplete({
  initialQuery,
  placeholder,
  submitText,
}: GameSearchAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    let isMounted = true;

    async function fetchSuggestions() {
      if (debouncedSearchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchGames(debouncedSearchTerm, "", "", "", 1);
        if (isMounted) {
          setSuggestions(results.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching autocomplete suggestions", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSuggestions();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchTerm]);

  return (
    <div ref={wrapperRef} className="relative w-full md:max-w-xl">
      <form
        method="GET"
        action="/games"
        className="flex flex-col sm:flex-row gap-3 w-full"
      >
        <div className="relative grow">
          <input
            type="text"
            name="query"
            id="game-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-light-blue transition-colors text-sm"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />

          {isLoading && (
            <Loader2 className="absolute right-3.5 top-3.5 w-4 h-4 text-light-blue animate-spin" />
          )}
        </div>

        <button
          type="submit"
          id="game-search-submit"
          className="px-6 py-3 bg-linear-to-r from-secondary-blue to-light-blue rounded-2xl font-extrabold text-sm hover:opacity-95 shadow-md shadow-light-blue/15 active:scale-95 transition-all"
        >
          <Search className="w-4 h-4 inline-block sm:hidden" />
          <span className="hidden sm:inline-block">{submitText}</span>
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {isFocused &&
        searchTerm.trim().length >= 2 &&
        (suggestions.length > 0 || isLoading) && (
          <div className="absolute top-full left-0 w-full mt-2 bg-primary-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50">
            {isLoading && suggestions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                Loading...
              </div>
            ) : (
              <ul className="flex flex-col">
                {suggestions.map((game) => {
                  const cover = game.cover
                    ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover.image_id}.webp`
                    : "/image-not-found.webp";

                  return (
                    <li
                      key={game.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <Link
                        href={`/games/${game.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-white/10 transition-colors"
                        onClick={() => setIsFocused(false)}
                      >
                        <div className="relative w-10 h-12 rounded overflow-hidden shrink-0">
                          <Image
                            src={cover}
                            alt={game.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized={!game.cover}
                          />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-bold text-white truncate">
                            {game.name}
                          </span>
                          {game.first_release_date && (
                            <span className="text-xs text-gray-400">
                              {new Date(
                                game.first_release_date * 1000,
                              ).getFullYear()}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
    </div>
  );
}
