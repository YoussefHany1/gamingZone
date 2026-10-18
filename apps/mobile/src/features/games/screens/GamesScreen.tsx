import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import FilterModal from "../components/gamesScreen/FilterModal";
import GamesFeed from "../components/gamesScreen/GamesFeed";
import GamesList from "../components/gamesScreen/GamesList";
import GamesLoadingSkeleton from "../components/gamesScreen/GamesLoadingSkeleton";
import GamesSearchHeader from "../components/gamesScreen/GamesSearchHeader";
import { useGames } from "../hooks/useGames";

/**
 * Browse screen: a search/filter header on top of either the loading skeleton,
 * the search/filter results, or the browsable feed of static game sections.
 */
function GamesScreen(): React.ReactElement {
  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    flex: { flex: 1 },
  }));

  const {
    searchQuery,
    filterVisible,
    filters,
    isReady,
    effectiveQuery,
    activeFilterCount,
    showResults,
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
  } = useGames();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <GamesSearchHeader
        searchQuery={searchQuery}
        showAutocomplete={showAutocomplete}
        activeFilterCount={activeFilterCount}
        onChangeText={handleSearchTextChange}
        onSubmit={handleSubmitSearch}
        onFocus={handleSearchFocus}
        onBlur={handleSearchBlur}
        onClear={handleClearSearch}
        onSelectSuggestion={handleAutocompleteSelect}
        onOpenFilter={openFilter}
      />

      {!isReady ? (
        <GamesLoadingSkeleton />
      ) : showResults ? (
        <View style={styles.flex}>
          <GamesList
            query={effectiveQuery || undefined}
            filters={filters}
            onBack={handleBack}
          />
        </View>
      ) : (
        <View style={styles.flex}>
          <GamesFeed onScroll={onScroll} />
        </View>
      )}

      <FilterModal
        visible={filterVisible}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={closeFilter}
      />
    </SafeAreaView>
  );
}

export default GamesScreen;
