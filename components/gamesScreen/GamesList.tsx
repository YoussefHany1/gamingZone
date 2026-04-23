import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ListRenderItemInfo,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { useTranslation } from "react-i18next";
import SkeletonGameCard from "../../skeleton/SkeletonGameCard";
import ErrorState from "../ErrorState";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";
import { Game } from "../types";
import { GameFilters } from "./FilterModal";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";

const CARD_HEIGHT = 290;
const CARD_WIDTH = 180;
const NUM_COLUMNS = 2;
const VALID_GAME_TYPES = [1, 2, 5, 6, 7, 8, 9, 10];

// Helpers

function getRatingColor(rating: number): string {
  if (rating <= 2) return "#8B0000";
  if (rating <= 4) return "#FF4C4C";
  if (rating <= 6) return "#FFA500";
  if (rating <= 8) return "#71e047";
  return "#006400";
}

async function fetchSearchResults(
  query: string | undefined,
  filters?: GameFilters,
): Promise<Game[]> {
  const params: Record<string, string> = {};
  if (query) params.q = query;
  if (filters?.year) params.year = filters.year;
  if (filters?.genre) params.genre = filters.genre;
  if (filters?.platform) params.platform = filters.platform;
  if (filters?.sort) params.sort = filters.sort;
  const response = await axios.get<Game[]>(`${SERVER_URL}/search`, { params });
  return response.data;
}

// Game Card

interface GameCardProps {
  item: Game;
}

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
        recyclingKey={item?.cover?.image_id ?? ""}
        source={
          item.cover
            ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`
            : require("../../assets/image-not-found.webp")
        }
        style={styles.cover}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
        allowDownscaling
      />
      {shouldShowLabel && (
        <Text style={styles.gameType}>{t(labelKey)}</Text>
      )}
      {item.total_rating != null && (
        <Text
          style={[
            styles.rating,
            { backgroundColor: getRatingColor(item.total_rating / 10) },
          ]}
        >
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

// GamesList

interface GamesListProps {
  query?: string;
  filters?: GameFilters;
  onBack?: () => void;
}

function GamesList({ query, filters, onBack }: GamesListProps) {
  const { t } = useTranslation();

  const safeQuery = (query ?? "all").replace(/\s/g, "_");
  const safeFilters = `${filters?.year ?? ""}_${filters?.genre ?? ""}_${filters?.platform ?? ""}_${filters?.sort ?? ""}`;
  const STORAGE_KEY = `GAMES_SEARCH_${safeQuery}_${safeFilters}`;

  const fetchGames = useCallback(
    () => fetchSearchResults(query, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filters?.year, filters?.genre, filters?.platform, filters?.sort],
  );

  const { data, isLoading, isRefetching, error, refetch } =
    useCachedData<Game[]>(STORAGE_KEY, fetchGames, [
      query,
      filters?.year,
      filters?.genre,
      filters?.platform,
      filters?.sort,
    ]);

  const games = data ?? [];
  const isInitialLoading = isLoading && games.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => <GameCard item={item} />,
    [],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Game> | null | undefined, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * Math.floor(index / NUM_COLUMNS),
      index,
    }),
    [],
  );

  const renderBackButton = useCallback(() => {
    if (!onBack) return null;
    return (
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
    );
  }, [onBack]);

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const refreshControl = (
    <RefreshControl
      refreshing={isRefetching && !isInitialLoading}
      onRefresh={handleRefresh}
      tintColor={COLORS.secondary}
      colors={[COLORS.secondary]}
    />
  );

  if (isInitialLoading) {
    return (
      <FlatList
        data={Array.from({ length: 6 }, (_, i) => ({ id: i } as Game))}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => String(item.id)}
        renderItem={() => <SkeletonGameCard />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderBackButton}
        contentContainerStyle={styles.listContent}
      />
    );
  }

  if (error || !Array.isArray(games)) {
    return (
      <ErrorState
        message={t("games.list.serverError")}
      />
    );
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
    <FlatList
      data={games}
      numColumns={NUM_COLUMNS}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderBackButton}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
    />
  );
}

export default React.memo(GamesList);

// Styles

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
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
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: "center",
    paddingBottom: 220,
  },
});