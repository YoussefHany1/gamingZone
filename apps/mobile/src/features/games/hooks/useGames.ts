import { useState, useEffect, useCallback, useMemo } from "react";
import { Keyboard } from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { useTranslation } from "react-i18next";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import type { GameFilters } from "../types";

// Helper – count active filters
function countActiveFilters(f: GameFilters): number {
  return (
    (f.year ? 1 : 0) +
    (f.genre ? 1 : 0) +
    (f.platform ? 1 : 0) +
    (f.sort && f.sort !== "relevance" ? 1 : 0)
  );
}

export function useGames() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [submittedQuery, setSubmittedQuery] = useState<string>("");
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [filters, setFilters] = useState<GameFilters>({
    year: null,
    genre: null,
    platform: null,
    sort: "relevance",
  });
  const [isReady, setIsReady] = useState<boolean>(false);
  const { onScroll } = useScrollDirection();

  useEffect(() => {
    const task = runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  const handleSearchTextChange = useCallback((text: string): void => {
    setSearchQuery(text);
    if (text === "") setSubmittedQuery("");
  }, []);

  const handleClearSearch = useCallback((): void => {
    setSearchQuery("");
    setSubmittedQuery("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  const handleSubmitSearch = useCallback((): void => {
    setSubmittedQuery(searchQuery);
    setSearchFocused(false);
    Keyboard.dismiss();
  }, [searchQuery]);

  const handleSearchFocus = useCallback((): void => {
    setSearchFocused(true);
  }, []);

  const handleSearchBlur = useCallback((): void => {
    // Slight delay so a tap on a suggestion row fires before hiding
    setTimeout(() => setSearchFocused(false), 150);
  }, []);

  /** Called when user picks a suggestion – clears input & hides autocomplete */
  const handleAutocompleteSelect = useCallback((): void => {
    setSearchQuery("");
    setSubmittedQuery("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  const handleApplyFilters = useCallback((newFilters: GameFilters): void => {
    setFilters(newFilters);
  }, []);

  const handleBack = useCallback((): void => {
    setSearchQuery("");
    setSubmittedQuery("");
    setFilters({ year: null, genre: null, platform: null, sort: "relevance" });
    Keyboard.dismiss();
  }, []);

  const openFilter = useCallback((): void => {
    setFilterVisible(true);
  }, []);

  const closeFilter = useCallback((): void => {
    setFilterVisible(false);
  }, []);

  // The text query sent to search (empty string = browse by filters only)
  const effectiveQuery = useMemo((): string => {
    return submittedQuery.trim();
  }, [submittedQuery]);

  const activeFilterCount = countActiveFilters(filters);
  const showResults = effectiveQuery !== "" || activeFilterCount > 0;

  /** Autocomplete should be visible when the input is focused and has text */
  const showAutocomplete = searchFocused && searchQuery.trim().length >= 2;

  return {
    t,
    searchQuery,
    filterVisible,
    filters,
    isReady,
    effectiveQuery,
    activeFilterCount,
    showResults,
    searchFocused,
    showAutocomplete,
    onScroll,
    handleSearchTextChange,
    handleClearSearch,
    handleSubmitSearch,
    handleSearchFocus,
    handleSearchBlur,
    handleAutocompleteSelect,
    handleApplyFilters,
    handleBack,
    openFilter,
    closeFilter,
  };
}

