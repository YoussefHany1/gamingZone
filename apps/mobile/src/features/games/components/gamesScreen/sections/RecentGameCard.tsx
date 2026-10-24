import React, { useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { getRatingGradient } from "@/src/constants/ratingColors";
import type { GamesStackParamList } from "../../../types";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { CoverImage } from "./CoverImage";
import type { Game } from "@/src/types/sharedTypes";
import { usePcCompatibility } from "@/src/features/pcSpecs/hooks/usePcCompatibility";
import PcQualityBadge from "@/src/features/pcSpecs/components/PcQualityBadge";

export type RecentGameCardProps = {
  item: Game;
};

const formatReleaseDate = (
  timestamp: number | null | undefined,
  locale: string,
): string => {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Row-style card for the feed's recently-released section.
 *
 * Ported verbatim from the legacy `gamesScreen/RecentlyReleased.tsx` card
 * (Phase 3 migration): same layout, same gradient/inline colors and same
 * derivation logic. The navigation prop is typed against `GamesStackParamList`
 * (the legacy version used a loose `NavigationProp<Record<string, ...>>`);
 * runtime navigation is identical.
 */
const RecentGameCard = React.memo<RecentGameCardProps>(({ item }) => {
  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const compatibility = usePcCompatibility(item.id, item.first_release_date);

  const styles = useThemeStyles((c) => ({
    gameCard: {
      marginHorizontal: 15,
      marginVertical: 8,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      position: "relative",
    },
    cardGradient: { position: "absolute", width: "100%", height: "100%" },
    cardContent: { flexDirection: "row", padding: 12 },
    coverContainer: { width: 110, height: 150, position: "relative" },
    cover: {
      width: "100%",
      height: "100%",
      borderRadius: 12,
      backgroundColor: c.skeletonBase,
    },
    ratingBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      elevation: 4,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      borderWidth: 1,
      borderColor: c.border,
    },
    ratingText: { color: c.text, fontSize: 13, fontWeight: "bold" },
    ratingIcon: { fontSize: 11 },
    infoContainer: {
      flex: 1,
      marginLeft: 12,
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    title: {
      color: c.text,
      fontSize: 17,
      fontWeight: "bold",
      lineHeight: 21,
      marginBottom: 8,
    },
    releaseDateContainer: {},
    releaseDate: { color: c.textMuted, fontSize: 13, fontWeight: "bold" },
    genreText: { color: c.textMuted, fontSize: 13 },
    newBadgeText: {
      position: "absolute",
      top: 0,
      right: 0,
      color: c.accentText,
      fontSize: 18,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
    platformsContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
    platformsText: { color: c.textMuted, fontSize: 13, flex: 1 },
  }));

  // Derive how many days ago the game was released
  const daysSince: number | null = item.first_release_date
    ? Math.ceil(
        Math.abs(Date.now() - item.first_release_date * 1000) / (1000 * 60 * 60 * 24),
      )
    : null;

  const isNew = daysSince !== null && daysSince <= 7;

  const handlePress = useCallback((): void => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress} activeOpacity={0.9}>
      <LinearGradient
        colors={[colors.skeletonBase, colors.backgroundDeep]}
        style={styles.cardGradient}
      />

      <View style={styles.cardContent}>
        {/* Cover + rating badge */}
        <View style={styles.coverContainer}>
          <CoverImage item={item} deriveRecyclingKey style={styles.cover} />

          {compatibility?.quality && (
            <PcQualityBadge
              quality={compatibility.quality}
              compact
              style={{ top: 6, left: 6 }}
            />
          )}

          {item.total_rating != null && (
            <LinearGradient
              colors={getRatingGradient(item.total_rating / 10)}
              style={styles.ratingBadge}
            >
              <CustomText style={styles.ratingText}>
                {(Math.round(item.total_rating) / 10).toFixed(1)}
              </CustomText>
            </LinearGradient>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <CustomText style={styles.title} numberOfLines={2}>
            {item.name}
          </CustomText>

          <View style={styles.releaseDateContainer}>
            <CustomText style={styles.releaseDate}>
              {formatReleaseDate(item.first_release_date, i18n.language)}
            </CustomText>
          </View>

          {item.genres && item.genres.length > 0 && (
            <CustomText style={styles.genreText} numberOfLines={1}>
              {item.genres.map((g) => g.name).join(", ")}
            </CustomText>
          )}

          {/* "NEW" badge visible for games released within the last 7 days */}
          {isNew && (
            <CustomText style={styles.newBadgeText}>
              {t("games.list.recentlyReleased.new")}
            </CustomText>
          )}

          {item.platforms && item.platforms.length > 0 && (
            <View style={styles.platformsContainer}>
              <CustomText style={styles.platformsText} numberOfLines={1}>
                {item.platforms
                  .slice(0, 3)
                  .map((p) => p.abbreviation ?? p.name)
                  .join(", ")}
              </CustomText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});
RecentGameCard.displayName = "RecentGameCard";

export default RecentGameCard;
