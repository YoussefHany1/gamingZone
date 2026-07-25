import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import SkeletonGameCard from "../../skeleton/gamesScreen/SkeletonGameCard";
import ErrorState from "@/src/components/ErrorState";
import COLORS from "@/src/constants/colors";
import useCachedData from "@/src/hooks/useCachedData";
import type { GameCardProps, GamesListProps, GameFilters } from "../../types";
import type { Game } from "@/src/types/sharedTypes";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import { searchGames } from "@/src/services/api/igdbApi";

const CARD_HEIGHT = 290;
const CARD_WIDTH = 180;
const NUM_COLUMNS = 2;
const VALID_GAME_TYPES = [1, 2, 5, 6, 7, 8, 9, 10];

// Helpers

// Pre-built StyleSheet objects for rating badge backgrounds, keyed by tier
const ratingStyles = StyleSheet.create({
  tier1: { backgroundColor: "#8B0000" },
  tier2: { backgroundColor: "#FF4C4C" },
  tier3: { backgroundColor: "#FFA500" },
  tier4: { backgroundColor: "#71e047" },
  tier5: { backgroundColor: "#006400" },
});

// Returns the pre-built style for a given score (0-10 scale)
function getRatingStyle(rating: number) {
  if (rating <= 2) return ratingStyles.tier1;
  if (rating <= 4) return ratingStyles.tier2;
  if (rating <= 6) return ratingStyles.tier3;
  if (rating <= 8) return ratingStyles.tier4;
  return ratingStyles.tier5;
}

async function fetchSearchResults(
  query: string | undefined,
  filters?: GameFilters,
): Promise<Game[]> {
  return searchGames({ query, filters });
}

// Game Card

const GameCard = React.memo<GameCardProps>(({ item }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const { t } = useTranslation();

  const labelKey = `games.list.gameTypes.${item.game_type}`;
  const shouldShowLabel = VALID_GAME_TYPES.includes(item.game_type ?? -1);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress}>
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
        recyclingKey={item.cover?.image_id || item.id.toString()}
      />
      {shouldShowLabel && <Text style={styles.gameType}>{t(labelKey)}</Text>}
      {item.total_rating != null && (
        <Text style={[styles.rating, getRatingStyle(item.total_rating / 10)]}>
          {Math.round(item.total_rating) / 10}
        </Text>
      )}
      <Text style={styles.title} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
});
GameCard.displayName = "GameCard";

// Main List

function GamesList({ query, filters, onBack }: GamesListProps) {
  const { t } = useTranslation();
  const { onScroll } = useScrollDirection();

  const safeQuery = (query ?? "all").replace(/\s/g, "_");
  const safeFilters = `${filters?.year ?? ""}_${filters?.genre ?? ""}_${filters?.platform ?? ""}_${filters?.sort ?? ""}`;
  const STORAGE_KEY = `GAMES_SEARCH_${safeQuery}_${safeFilters}`;

  const fetchGames = useCallback(
    () => fetchSearchResults(query, filters),
    [query, filters?.year, filters?.genre, filters?.platform, filters?.sort],
  );

  const { data, isLoading, isRefetching, error, refetch } = useCachedData<
    Game[]
  >(STORAGE_KEY, fetchGames, [
    query,
    filters?.year,
    filters?.genre,
    filters?.platform,
    filters?.sort,
  ]);

  const games = data ?? [];
  const isInitialLoading = isLoading && games.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => (
      <View style={styles.cardWrapper}>
        <GameCard item={item} />
      </View>
    ),
    [],
  );

  const renderBackButton = useCallback(() => {
    if (!onBack) return null;
    return (
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
    );
  }, [onBack]);

  const handleRefresh = useCallback(() => refetch(true), [refetch]);

  const refreshControl = (
    <RefreshControl
      refreshing={isRefetching && !isInitialLoading}
      onRefresh={handleRefresh}
      tintColor={COLORS.secondary}
      colors={[COLORS.secondary]}
    />
  );

  const renderSkeletonItem = useCallback(
    () => (
      <View style={styles.cardWrapper}>
        <SkeletonGameCard />
      </View>
    ),
    [],
  );

  const skeletonData = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ id: i }) as unknown as Game),
    [],
  );

  if (isInitialLoading) {
    return (
      <FlashList
        data={skeletonData}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSkeletonItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderBackButton}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        estimatedItemSize={290}
      />
    );
  }

  if (error || !Array.isArray(games)) {
    return <ErrorState message={t("games.list.serverError")} />;
  }

  if (games.length === 0) {
    return (
      <View>
        {renderBackButton()}
        <Text style={styles.noResults}>{t("games.list.noResults")}</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={games}
      numColumns={NUM_COLUMNS}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderBackButton}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
      onScroll={onScroll}
      scrollEventThrottle={16}
      estimatedItemSize={CARD_HEIGHT}
    />
  );
}

export default React.memo(GamesList);

// Styles

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  gameCard: {
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 16,
    padding: 10,
    margin: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 270,
    width: 160,
  },
  cover: {
    width: 140,
    height: 190,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
  },
  gameType: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "white",
    fontWeight: "600",
    top: 0,
    left: 0,
    padding: 5,
    margin: 12,
    borderRadius: 12,
  },
  title: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
    width: "100%",
    height: 40,
  },
  rating: {
    color: "white",
    position: "absolute",
    textAlign: "center",
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 16,
    textAlignVertical: "center",
    width: 45,
    height: 45,
    top: 0,
    right: 0,
    fontSize: 18,
    fontWeight: "bold",
  },
  noResults: {
    color: "#999",
    textAlign: "center",
    fontSize: 16,
    marginVertical: 20,
  },
  listContent: {
    paddingHorizontal: 5,
    paddingBottom: 90,
  },
  cardWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
