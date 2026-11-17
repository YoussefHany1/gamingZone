import React, { useEffect, useRef, useState, useCallback } from "react";
import { igdbImageUrl } from "@gaming-zone/utils";
import CustomText from "@/src/components/CustomText";
import {
  View,
  Pressable,
  ActivityIndicator,
  Animated,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import AppImage from "@/src/components/AppImage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Game } from "@/src/types/sharedTypes";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";
import { searchGamesAutocomplete } from "@/src/services/api/igdbApi";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useTranslation } from "react-i18next";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCoverUri(imageId?: string): string | null {
  if (!imageId) return null;
  return igdbImageUrl(imageId, "cover_small");
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchAutocompleteProps = {
  query: string;
  visible: boolean;
  /** Called when user taps a suggestion row (so parent can dismiss keyboard, etc.) */
  onSelect: (game: Game) => void;
};

// ─── Row ──────────────────────────────────────────────────────────────────────

type RowProps = { item: Game; onPress: (game: Game) => void };

const SuggestionRow = React.memo<RowProps>(({ item, onPress }) => {
  const styles = useThemeStyles((c) => ({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 12,
    },
    cover: {
      width: 38,
      height: 50,
      borderRadius: 6,
      backgroundColor: c.skeletonBase,
    },
    name: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      fontWeight: "500",
    },
  }));

  const coverUri = getCoverUri(item.cover?.image_id);
  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={handlePress}
      android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
      accessibilityRole="button"
    >
      {coverUri ? (
        <AppImage
          source={{ uri: coverUri }}
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.cover?.image_id ?? null}
        />
      ) : (
        <AppImage
          source={require("@/assets/image-not-found.webp")}
          style={styles.cover}
          contentFit="cover"
        />
      )}
      <CustomText style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {item.name}
      </CustomText>
    </Pressable>
  );
});
SuggestionRow.displayName = "SuggestionRow";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SearchAutocomplete({
  query,
  visible,
  onSelect,
}: SearchAutocompleteProps) {
  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    loaderWrap: {
      paddingVertical: 20,
      alignItems: "center",
    },
    noResultsWrap: {
      paddingVertical: 18,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    noResultsText: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center",
    },
    separator: {
      height: 1,
      backgroundColor: c.border,
    },
  }));

  const [suggestions, setSuggestions] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!visible || query.trim().length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchGamesAutocomplete(query.trim());
        setSuggestions(results ?? []);
      } catch {
        // ignore cancelled / error
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible]);

  // Fade animation
  const shouldShow = visible && query.trim().length >= MIN_QUERY_LEN;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, opacity]);

  const handleSelect = useCallback(
    (game: Game) => {
      onSelect(game);
      setSuggestions([]);
      navigation.navigate("GameDetails", { gameID: game.id });
    },
    [onSelect, navigation],
  );

  const keyExtractor = useCallback((item: Game) => String(item.id), []);
  const renderItem = useCallback(
    ({ item }: { item: Game }) => <SuggestionRow item={item} onPress={handleSelect} />,
    [handleSelect],
  );

  if (!shouldShow) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {loading && suggestions.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={colors.accentText}/>
        </View>
      ) : suggestions.length === 0 ? (
        <View style={styles.noResultsWrap}>
          <CustomText style={styles.noResultsText}>{t("games.noResults")}</CustomText>
        </View>
      ) : (
        <FlashList
          data={suggestions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
