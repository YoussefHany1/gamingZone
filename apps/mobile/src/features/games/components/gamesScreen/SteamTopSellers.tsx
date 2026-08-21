import React, { useCallback } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
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
import COLORS from "@/src/constants/colors";
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
const STEAM_BLUE_DIM = "#516996";
const STEAM_DARK = COLORS.primary;
const STEAM_CARD_BG = "#172a4a";

const getReviewLabel = (rating: number): { label: string; color: string } => {
  if (rating >= 9) return { label: "Overwhelmingly +", color: STEAM_BLUE };
  if (rating >= 8) return { label: "Very Positive", color: STEAM_BLUE };
  if (rating >= 7) return { label: "Mostly Positive", color: STEAM_BLUE };
  if (rating >= 5) return { label: "Mixed", color: STEAM_BLUE_DIM };
  return { label: "Mostly Negative", color: STEAM_BLUE_DIM };
};

// Card

const SteamTopSellersCard = React.memo<SteamTopSellersCardProps>(({ item, index }) => {
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
          colors={["transparent", STEAM_DARK]}
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
          estimatedItemSize={192}
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
        <FlashList renderScrollComponent={GHScrollView as any}
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
          estimatedItemSize={192}
        />
      )}
    </View>
  );
}

export default SteamTopSellers;

const styles = StyleSheet.create({
  /* â”€â”€ Header â”€â”€ */
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 10,
  },

  /* â”€â”€ Error â”€â”€ */
  errorContainer: {
    width: "100%",
    height: CARD_HEIGHT,
  },

  /* â”€â”€ Card â”€â”€ */
  gameCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: STEAM_CARD_BG,
    // Steam-style: thin left border + very subtle right shadow
    borderWidth: 1,
    borderColor: STEAM_BLUE_DIM + "55",
  },

  /* Blue / gold top stripe */
  topAccentBar: {
    height: 3,
    backgroundColor: STEAM_BLUE_DIM,
  },
  topAccentBarGold: {
    backgroundColor: COLORS.secondary,
  },

  /* â”€â”€ Cover â”€â”€ */
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

  /* Rank badge â€” bottom-left of cover */
  rankBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(12, 26, 51, 0.88)",
    borderLeftWidth: 2,
    borderLeftColor: STEAM_BLUE_DIM,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  rankBadgeGold: {
    borderLeftColor: "#c6a84b",
  },
  rankHashSymbol: {
    color: STEAM_BLUE,
    fontSize: 10,
    fontWeight: "700",
    marginRight: 1,
  },
  rankNumber: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },

  /* Tiny "STEAM" watermark top-right */
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

  /* â”€â”€ Info section â”€â”€ */
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
    backgroundColor: STEAM_BLUE_DIM + "40",
    marginVertical: 2,
  },

  /* Review score */
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

  /* â”€â”€ List â”€â”€ */
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
