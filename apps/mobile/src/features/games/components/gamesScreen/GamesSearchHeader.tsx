import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import { CircleX, Search, SlidersHorizontal } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import SearchAutocomplete from "./SearchAutocomplete";
import RandomGameButton from "./RandomGameButton";
import type { GamesSearchHeaderProps } from "./types";

const CLEAR_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const FILTER_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

/**
 * Search bar row (input + clear + random-game + filter) plus the absolutely
 * positioned autocomplete dropdown below it.
 */
const GamesSearchHeader: React.FC<GamesSearchHeaderProps> = ({
  searchQuery,
  showAutocomplete,
  activeFilterCount,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  onClear,
  onSelectSuggestion,
  onOpenFilter,
}) => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    searchSection: {
      zIndex: 100,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 20,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    autocompleteWrapper: {
      position: "relative",
      marginTop: 6,
    },
    searchBarContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      paddingHorizontal: 15,
      paddingBottom: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: c.text,
      fontSize: 16,
    },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    filterBtnActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    filterBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: c.danger,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    filterBadgeText: {
      color: "#ffffff",
      fontSize: 10,
      fontWeight: "700",
    },
  }));

  const filterActive = activeFilterCount > 0;

  return (
    <View style={styles.searchSection}>
      <View style={styles.searchRow}>
        <View style={styles.searchBarContainer}>
          <Search size={18} color={colors.textSubtle} style={styles.searchIcon} />
          <CustomTextInput
            style={styles.searchInput}
            placeholder={t("games.searchPlaceholder")}
            placeholderTextColor={colors.textSubtle}
            value={searchQuery}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            onFocus={onFocus}
            onBlur={onBlur}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={onClear} hitSlop={CLEAR_HIT_SLOP}>
              <CircleX size={24} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>

        {/* Random game suggestion button */}
        <RandomGameButton />

        {/* Filter button */}
        <TouchableOpacity
          style={[styles.filterBtn, filterActive && styles.filterBtnActive]}
          onPress={onOpenFilter}
          hitSlop={FILTER_HIT_SLOP}
        >
          <SlidersHorizontal
            size={20}
            color={filterActive ? colors.text : colors.textMuted}
          />
          {filterActive && (
            <View style={styles.filterBadge}>
              <CustomText style={styles.filterBadgeText}>
                {activeFilterCount}
              </CustomText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Autocomplete dropdown — absolutely positioned below the search row */}
      <View style={styles.autocompleteWrapper}>
        <SearchAutocomplete
          query={searchQuery}
          visible={showAutocomplete}
          onSelect={onSelectSuggestion}
        />
      </View>
    </View>
  );
};

export default memo(GamesSearchHeader);
