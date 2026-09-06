import React, { useEffect, useRef, useState, useCallback } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Game } from "@/src/types/sharedTypes";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";
import { searchGamesAutocomplete } from "@/src/services/api/igdbApi";
import COLORS from "@/src/constants/colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCoverUri(imageId?: string): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_small/${imageId}.webp`;
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
  const coverUri = getCoverUri(item.cover?.image_id);
  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.7}>
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.cover?.image_id ?? null}
        />
      ) : (
        <Image
          source={require("@/assets/image-not-found.webp")}
          style={styles.cover}
          contentFit="cover"
        />
      )}
      <CustomText style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {item.name}
      </CustomText>
    </TouchableOpacity>
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
  const shouldShow = visible && (loading || suggestions.length > 0);

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
          <ActivityIndicator size="small" color={COLORS.secondary} />
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

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.darkBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    overflow: "hidden",
    maxHeight: 340,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  loaderWrap: {
    padding: 18,
    alignItems: "center",
  },
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
    backgroundColor: "#1e2a45",
  },
  name: {
    flex: 1,
    color: "#e8edf5",
    fontSize: 15,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(81,105,150,0.25)",
    marginHorizontal: 14,
  },
});
