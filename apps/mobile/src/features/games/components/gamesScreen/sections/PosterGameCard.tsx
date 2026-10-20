import React, { useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import { Star } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { CoverImage } from "./CoverImage";
import type { GamesStackParamList } from "../../../types";
import type { Game } from "@/src/types/sharedTypes";

/**
 * The unified poster card of the games feed — Phase 4's one true merge:
 * `PopularCard` (poster + rank pill + Star icon), `RecommendedCard` (the
 * popular poster without the rank pill, with the legacy thumb emoji stat
 * icon) and `TrendingGameCard` (poster + rank pill with its own
 * recyclingKey) were the same layout with four presentation deltas, now
 * explicit props instead of three copies:
 *
 * - `index` present → the `#rank` pill badge renders (Popular, Trending);
 *   absent → hidden (Recommended — its recommendation rank was never shown).
 * - `statIconVariant`: "star" renders the lucide Star; "emoji" renders the
 *   Recommended card's `⭐` CustomText with its `statIcon` style. The emoji
 *   is a retained quirk, not an oversight to fix silently.
 * - `centerStatItems`: Popular's stat pill carried `alignItems: "center"`,
 *   the other two did not. Preserved per card.
 * - `deriveRecyclingKey`: forwarded to CoverImage — only the Trending rail
 *   historically derived one.
 *
 * The trio's dead `cardBackground` style and its commented-out gradient
 * JSX (present in all three files from the legacy) are dropped here — Phase
 * 4 found no consumer; the visible card never changed.
 */
export type PosterGameCardProps = {
  item: Game;
  index?: number;
  statIconVariant?: "star" | "emoji";
  deriveRecyclingKey?: boolean;
  centerStatItems?: boolean;
};

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 5;

const PosterGameCard = React.memo<PosterGameCardProps>(
  ({ item, index, statIconVariant = "star", deriveRecyclingKey = false, centerStatItems = false }) => {
    const colors = useThemeColors();
    const styles = useThemeStyles((c) => ({
      gameCard: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginHorizontal: CARD_MARGIN,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      },
      coverContainer: { width: "100%", height: 190, position: "relative" },
      cover: { width: "100%", height: "100%" },
      coverGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60%",
      },
      trendBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        backgroundColor: "rgba(12, 26, 51, 0.9)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        borderWidth: 1,
        borderColor: c.textMuted,
      },
      trendRank: { color: c.textMuted, fontSize: 13, fontWeight: "bold" },
      infoContainer: { flex: 1, padding: 12, gap: 8 },
      title: { color: c.text, fontSize: 15, fontWeight: "bold", lineHeight: 18 },
      statsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      },
      statItem: {
        flexDirection: "row",
        ...(centerStatItems && { alignItems: "center" as const }),
        backgroundColor: "rgba(119, 155, 221, 0.15)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: c.accentSurface,
      },
      statIcon: { fontSize: 12 },
      statValue: { color: c.textMuted, fontSize: 12, fontWeight: "bold" },
      platformsContainer: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
      platformChip: {
        backgroundColor: c.accentSurface,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.accentText,
      },
      platformText: { color: c.textMuted, fontSize: 10, fontWeight: "600" },
    }));

    const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();

    const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;
    const rank = index === undefined ? null : index + 1;

    const handlePress = useCallback(() => {
      navigation.navigate("GameDetails", { gameID: item.id });
    }, [navigation, item.id]);

    return (
      <TouchableOpacity style={styles.gameCard} onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.coverContainer}>
          <CoverImage item={item} deriveRecyclingKey={deriveRecyclingKey} style={styles.cover} />
          <LinearGradient
            colors={["transparent", colors.backgroundDeep]}
            style={styles.coverGradient}
          />
          {rank !== null && (
            <View style={styles.trendBadge}>
              <CustomText style={styles.trendRank}>#{rank}</CustomText>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <CustomText style={styles.title} numberOfLines={2}>
            {item.name}
          </CustomText>

          <View style={styles.statsContainer}>
            {rating > 0 && (
              <View style={styles.statItem}>
                {statIconVariant === "star" ? (
                  <Star size={12} color={colors.accentText}/>
                ) : (
                  <CustomText style={styles.statIcon}>⭐</CustomText>
                )}
                <CustomText style={styles.statValue}>{rating.toFixed(1)}</CustomText>
              </View>
            )}
            {item.platforms && item.platforms.length > 0 && (
              <View style={styles.platformsContainer}>
                {item.platforms.slice(0, 3).map((platform, idx) => (
                  <View key={idx} style={styles.platformChip}>
                    <CustomText style={styles.platformText} numberOfLines={1}>
                      {platform.abbreviation ?? platform.name}
                    </CustomText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);
PosterGameCard.displayName = "PosterGameCard";

export default PosterGameCard;
