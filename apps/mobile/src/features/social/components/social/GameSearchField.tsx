import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { igdbImageUrl } from "@gaming-zone/utils";
import { useTranslation } from "react-i18next";
import type { Game } from "@/src/types/sharedTypes";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import PressScale from "@/src/components/PressScale";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { searchGamesAutocomplete } from "@/src/services/api/igdbApi";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;
const RESULT_LIMIT = 8;
const RESULTS_MAX_HEIGHT = 232;

export type GameSearchSelection = { name: string };

type GameSearchFieldProps = {
  selected: GameSearchSelection | null;
  /** When true the selection is fixed (e.g. rescheduling an existing session). */
  locked?: boolean;
  onSelect: (game: Game) => void;
  onClear: () => void;
};

type RowProps = { game: Game; onPress: (game: Game) => void };

function SuggestionRow({ game, onPress }: RowProps): React.ReactElement {
  const styles = useThemeStyles((c) => ({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 11,
      paddingVertical: 8,
      gap: 10,
    },
    cover: {
      width: 32,
      height: 43,
      borderRadius: 6,
      backgroundColor: c.skeletonBase,
    },
    name: { flex: 1, color: c.text, fontSize: 14, fontWeight: "600" },
  }));
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(game)}
      activeOpacity={0.7}
    >
      <Image
        source={
          game.cover
            ? { uri: igdbImageUrl(game.cover.image_id, "cover_small") }
            : require("@/assets/image-not-found.webp")
        }
        style={styles.cover}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={game.cover?.image_id || game.id.toString()}
      />
      <CustomText style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {game.name}
      </CustomText>
    </TouchableOpacity>
  );
}

export default function GameSearchField({
  selected,
  locked = false,
  onSelect,
  onClear,
}: GameSearchFieldProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const games = await searchGamesAutocomplete(trimmed, RESULT_LIMIT);
        if (requestIdRef.current === requestId) setResults(games ?? []);
      } catch {
        if (requestIdRef.current === requestId) setResults([]);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const startNewSearch = useCallback(() => {
    requestIdRef.current += 1;
    setQuery("");
    setResults([]);
    setLoading(false);
    onClear();
  }, [onClear]);

  const styles = useThemeStyles((c) => ({
    input: { flex: 1, color: c.text, paddingVertical: 8, fontSize: 15 },
    selected: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 9,
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    selectedInfo: { flex: 1, gap: 2 },
    selectedName: { color: c.text, fontSize: 14, fontWeight: "800" },
    changeButton: {
      minHeight: 30,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      borderRadius: 9,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
    },
    changeButtonText: { color: c.text, fontSize: 11, fontWeight: "700" },
    results: {
      marginTop: 6,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      backgroundColor: c.background,
    },
    resultSeparator: { height: 1, backgroundColor: c.border },
    feedback: {
      height: RESULTS_MAX_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    feedbackText: { color: c.textMuted, fontSize: 12 },
    fixedLabel: { color: c.textMuted, fontSize: 11 },
  }));

  if (selected) {
    return (
      <View style={styles.selected}>
        <View style={styles.selectedInfo}>
          <CustomText style={styles.selectedName} numberOfLines={1}>
            {selected.name}
          </CustomText>
          {locked ? (
            <CustomText style={styles.fixedLabel}>
              {t("social.sessions.gameName")}
            </CustomText>
          ) : null}
        </View>
        {!locked && (
          <PressScale style={styles.changeButton} onPress={startNewSearch}>
            <CustomText style={styles.changeButtonText}>
              {t("social.sessions.changeGame")}
            </CustomText>
          </PressScale>
        )}
      </View>
    );
  }

  const trimmed = query.trim();
  const showNoResults = trimmed.length >= MIN_QUERY_LEN && !loading && results.length === 0;

  return (
    <View>
      <CustomTextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("social.sessions.searchGame")}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {trimmed.length >= MIN_QUERY_LEN ? (
        <View style={styles.results}>
          {loading ? (
            <View style={styles.feedback}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : showNoResults ? (
            <View style={styles.feedback}>
              <CustomText style={styles.feedbackText}>
                {t("social.sessions.noGamesFound")}
              </CustomText>
            </View>
          ) : (
            <View>
              {results.map((game, index) => (
                <View key={String(game.id)}>
                  {index > 0 && <View style={styles.resultSeparator} />}
                  <SuggestionRow game={game} onPress={onSelect} />
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
