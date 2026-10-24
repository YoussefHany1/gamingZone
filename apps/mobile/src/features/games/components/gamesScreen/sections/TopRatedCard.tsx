import React, { useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { getRatingGradient } from "@/src/constants/ratingColors";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { CoverImage } from "./CoverImage";
import type { GamesStackParamList } from "../../../types";
import type { Game } from "@/src/types/sharedTypes";
import { usePcCompatibility } from "@/src/features/pcSpecs/hooks/usePcCompatibility";
import PcQualityBadge from "@/src/features/pcSpecs/components/PcQualityBadge";

export type TopRatedCardProps = {
  item: Game;
  index: number;
};

const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_MARGIN = 5;

const getMedalEmoji = (rank: number): string => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

/**
 * Ranked card for the feed's top-rated section.
 *
 * Ported verbatim from the legacy `gamesScreen/TopRated.tsx` card (Phase 3
 * migration): podium medals for the top 3, per-rank glow gradient colours,
 * circular rating gradient from `getRatingGradient` (still living in
 * gameDetails/utils, as in the legacy — Phase 4 moves it to src/constants
 * when its second consumer appears outside the feed), and the year nested
 * inside the title text node.
 *
 * Type-level cleanup, silent at runtime: the navigation prop is typed
 * against `GamesStackParamList` (the legacy used the loose
 * `NavigationProp<Record<string, object | undefined>>`; runtime call is
 * identical, and `Popular`'s card already used the typed version).
 */
const TopRatedCard = React.memo<TopRatedCardProps>(({ item, index }) => {
  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const colors = useThemeColors();
  const compatibility = usePcCompatibility(item.id, item.first_release_date);

  const styles = useThemeStyles((c) => ({
    cardBackground: { position: "absolute", width: "100%", height: "100%" },
    gameCard: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginHorizontal: CARD_MARGIN,
      borderRadius: 20,
      overflow: "hidden",
    },
    rankBadge: {
      position: "absolute",
      top: -5,
      left: -5,
      zIndex: 10,
      backgroundColor: c.scrimSolid,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.accentBorder,
      elevation: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    },
    rankText: { fontSize: 24 },
    coverContainer: { width: "100%", height: 160, position: "relative" },
    cover: { width: "100%", height: "100%" },
    coverGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "50%",
    },
    infoContainer: {
      flex: 1,
      padding: 12,
      justifyContent: "space-between",
    },
    title: {
      color: c.text,
      fontSize: 16,
      fontWeight: "bold",
      lineHeight: 20,
      alignItems: "center",
    },
    ratingMainContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    ratingCircle: {
      width: 55,
      height: 55,
      borderRadius: 33,
      justifyContent: "center",
      alignItems: "center",
      elevation: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      borderWidth: 3,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    ratingNumber: { color: c.text, fontSize: 20, fontWeight: "bold" },
    starContainer: {
      position: "absolute",
      bottom: -3,
      right: -3,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderRadius: 10,
      width: 18,
      height: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    starIcon: { fontSize: 10 },
    genresContainer: {
      flexDirection: "column",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 6,
    },
    genreBadge: {
      backgroundColor: c.accentSurface,
      paddingHorizontal: 5,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    genreText: { color: c.accentText, fontSize: 11, fontWeight: "600" },
    yearContainer: {
      backgroundColor: c.accentSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    yearText: {
      color: c.textSubtle,
      fontSize: 11,
      fontWeight: "600",
    },
    glowBorder: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "transparent",
      zIndex: -1,
    },
  }));

  const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;
  const ratingColors = getRatingGradient(rating);
  const rank = index + 1;

  const handlePress = useCallback((): void => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  // Glow gradient colours vary by podium position
  const glowColors: [string, string, string] =
    rank === 1
      ? ["#FFD700", "#FFA500", "transparent"]
      : rank === 2
        ? ["#C0C0C0", "#808080", "transparent"]
        : ["#CD7F32", "#8B4513", "transparent"];

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress} activeOpacity={0.9}>
      <LinearGradient
        colors={["transparent", colors.scrimSolid]}
        style={styles.cardBackground}
      />

      {/* Medal badge for top-3 */}
      {rank <= 3 && (
        <View style={styles.rankBadge}>
          <CustomText style={styles.rankText}>{getMedalEmoji(rank)}</CustomText>
        </View>
      )}

      {/* Cover image */}
      <View style={styles.coverContainer}>
        <CoverImage item={item} style={styles.cover} />
        <LinearGradient
          colors={["transparent", colors.scrim]}
          style={styles.coverGradient}
        />
        {compatibility?.quality && (
          <PcQualityBadge
            quality={compatibility.quality}
            compact
            style={{ top: 8, right: 8 }}
          />
        )}
      </View>

      {/* Game info */}
      <View style={styles.infoContainer}>
        <CustomText style={styles.title} numberOfLines={3}>
          {item.name}
          {"\n"}
          {item.first_release_date && (
            <CustomText style={styles.yearText}>
              {new Date(item.first_release_date * 1000).getFullYear()}
            </CustomText>
          )}
        </CustomText>

        {/* Rating circle + genre badges */}
        <View style={styles.ratingMainContainer}>
          <LinearGradient
            colors={ratingColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ratingCircle}
          >
            <CustomText style={styles.ratingNumber}>{rating.toFixed(1)}</CustomText>
          </LinearGradient>

          {item.genres && item.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {item.genres.slice(0, 2).map((genre, idx) => (
                <View key={idx} style={styles.genreBadge}>
                  <CustomText style={styles.genreText} numberOfLines={1}>
                    {genre.name}
                  </CustomText>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Coloured border glow for top-3 */}
      {rank <= 3 && <LinearGradient colors={glowColors} style={styles.glowBorder} />}
    </TouchableOpacity>
  );
});
TopRatedCard.displayName = "TopRatedCard";

export default TopRatedCard;
