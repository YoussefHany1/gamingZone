import type { NativeScrollEvent, NativeSyntheticEvent, TextInput } from "react-native";
import type { RefObject } from "react";

/** Props for the search bar + filter row + autocomplete overlay. */
export type GamesSearchHeaderProps = {
  searchQuery: string;
  /** Ref forwarded to the search input for programmatic focus. */
  inputRef?: RefObject<TextInput | null> | undefined;
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
