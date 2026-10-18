import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Props for the search bar + filter row + autocomplete overlay. */
export type GamesSearchHeaderProps = {
  searchQuery: string;
  /** Autocomplete dropdown should be shown (input focused + query >= 2 chars). */
  showAutocomplete: boolean;
  activeFilterCount: number;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
  /** A suggestion row was tapped — the parent dismisses the keyboard. */
  onSelectSuggestion: () => void;
  onOpenFilter: () => void;
};

/** Props for the browsable feed of static game sections. */
export type GamesFeedProps = {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};
