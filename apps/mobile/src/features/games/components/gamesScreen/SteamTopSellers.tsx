import React, { useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import CustomText from "@/src/components/CustomText";
import { Image } from "expo-image";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import ErrorState from "@/src/components/ErrorState";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonPopular from "@/src/features/games/skeleton/gamesScreen/SkeletonPopular";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeStore } from "@/src/store/useThemeStore";
import useCachedData from "@/src/hooks/useCachedData";
import type { SteamTopSellersCardProps } from "../../types";
import type { Game } from "@/src/types/sharedTypes";
import SectionTitle from "../../../../components/SectionTitle";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";
import { fetchSteamTopSellerGames } from "@/src/services/api/igdbApi";

const CARD_WIDTH = 180;
const CARD_HEIGHT = 280;
const CARD_MARGIN = 6;
const STORAGE_KEY = "GAMES_CACHE_STEAM_TOP_SELLERS";

const STEAM_BLUE = "#9CB4DD";
const STEAM_CARD_BG = "#172a4a";

const getReviewLabel = (rating: number): { label: string; color: string } => {
  // Read imperatively: this helper is module-level, but it is called during
  // render so it always observes the palette active for that render.
  const { colors } = useThemeStore.getState();
  const STEAM_BLUE_DIM = colors.accentText;
  if (rating >= 9) return { label: "Overwhelmingly +", color: STEAM_BLUE };
  if (rating >= 8) return { label: "Very Positive", color: STEAM_BLUE };
  if (rating >= 7) return { label: "Mostly Positive", color: STEAM_BLUE };
  if (rating >= 5) return { label: "Mixed", color: STEAM_BLUE_DIM };
  return { label: "Mostly Negative", color: STEAM_BLUE_DIM };
};

// Card

const SteamTopSellersCard = React.memo<SteamTopSellersCardProps>(({ item, index }) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    gameCard: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginHorizontal: CARD_MARGIN,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: STEAM_CARD_BG,
      // Steam-style: thin left border + very subtle right shadow
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    topAccentBar: {
      height: 3,
      backgroundColor: c.accent,
    },
    topAccentBarGold: { backgroundColor: c.accent },
    coverContainer: {
      width: "100%",
      height: 168,
      position: "relative",
    },
    cover: {
      width: "100%",
      height: "100%",
    },
    coverGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "45%",
    },
    rankBadge: {
      position: "absolute",
      bottom: 8,
      left: 8,
      flexDirection: "row",
      alignItems: "baseline",
      backgroundColor: "rgba(12, 26, 51, 0.88)",
      borderLeftWidth: 2,
      borderLeftColor: c.accent,
      paddingLeft: 6,
      paddingRight: 8,
      paddingVertical: 3,
      borderRadius: 2,
    },
    rankBadgeGold: { borderLeftColor: "#c6a84b" },
    rankHashSymbol: {
      color: STEAM_BLUE,
      fontSize: 10,
      fontWeight: "700",
      marginRight: 1,
    },
    rankNumber: {
      color: c.text,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 20,
    },
    steamIconMark: {
      position: "absolute",
      top: 7,
      right: 7,
      backgroundColor: "rgba(12, 26, 51, 0.75)",
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 2,
    },
    steamIconText: {
      color: STEAM_BLUE + "cc",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 1.5,
    },
    infoSection: {
      flex: 1,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 5,
    },
    gameTitle: {
      color: "#c7d5e0",
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 17,
    },
    divider: {
      height: 1,
      backgroundColor: c.accentSurface,
      marginVertical: 2,
    },
    reviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    reviewDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    reviewLabel: {
      fontSize: 10,
      fontWeight: "600",
    },
  }));

  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;
  const rank = index + 1;
  const review = rating > 0 ? getReviewLabel(rating) : null;
  const isTopThree = rank <= 3;

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress} activeOpacity={0.85}>
      {/* Steam-style top accent border */}
      <View style={[styles.topAccentBar, isTopThree && styles.topAccentBarGold]} />

      {/* Cover image area */}
      <View style={styles.coverContainer}>
        <Image
          source={
            item.cover
              ? {
                  uri: `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`,
                }
              : require("@/assets/image-not-found.webp")
          }
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
        />

        {/* Bottom gradient */}
        <LinearGradient
          colors={["transparent", colors.backgroundDeep]}
          style={styles.coverGradient}
        />

        {/* Rank badge â€” Steam "Top Seller" ribbon style */}
        <View style={[styles.rankBadge, isTopThree && styles.rankBadgeGold]}>
          <CustomText style={styles.rankHashSymbol}>#</CustomText>
          <CustomText style={styles.rankNumber}>{rank}</CustomText>
        </View>

        {/* Tiny "STEAM" watermark top-right */}
        <View style={styles.steamIconMark}>
          <CustomText style={styles.steamIconText}>STEAM</CustomText>
        </View>
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        <CustomText style={styles.gameTitle} numberOfLines={3}>
          {item.name}
        </CustomText>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Review score row */}
        {review && (
          <View style={styles.reviewRow}>
            <View style={[styles.reviewDot, { backgroundColor: review.color }]} />
            <CustomText style={[styles.reviewLabel, { color: review.color }]}>
              {review.label}
            </CustomText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});
SteamTopSellersCard.displayName = "SteamTopSellersCard";

// Main

function SteamTopSellers(): React.ReactElement {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 18,
      marginTop: 18,
      marginBottom: 10,
    },
    errorContainer: {
      width: "100%",
      height: CARD_HEIGHT,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
  }));

  const { t } = useTranslation();

  const {
    data: games,
    isLoading,
    error,
  } = useCachedData<Game[]>(STORAGE_KEY, fetchSteamTopSellerGames, []);

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Game>) => (
      <SteamTopSellersCard item={item} index={index} />
    ),
    [],
  );

  return (
    <View>
      {/* Section header */}
      <View style={styles.headerContainer}>
        <SectionTitle
          title={t("games.list.steamTopSellers.title", "Steam Top Sellers")}
          fontSize={24}
          subtitle={t(
            "games.list.steamTopSellers.subtitle",
            "Global top selling games on Steam",
          )}
        />
      </View>

      {/* Skeleton loading */}
      {isActuallyLoading && (
        <FlashList
          data={Array.from({ length: 5 }, (_, i) => ({ id: i }) as any)}
          horizontal
          renderItem={() => <SkeletonPopular />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Error state */}
      {(error || !Array.isArray(gamesToShow)) && (
        <View style={styles.errorContainer}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {/* Games list */}
      {!error && Array.isArray(gamesToShow) && !isActuallyLoading && (
        <FlashList
          renderScrollComponent={GHScrollView as any}
          data={gamesToShow}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.errorContainer}>
              <ErrorState message={t("games.list.noResults", "No games found")} />
            </View>
          }
        />
      )}
    </View>
  );
}

export default SteamTopSellers;
