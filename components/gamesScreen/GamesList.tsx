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
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";
import { Game } from "../types";
import { GameFilters } from "./FilterModal";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";

const CARD_HEIGHT = 290; // card 270px + 10px margin top + 10px margin bottom
const CARD_WIDTH = 180;

// Factory – sends query + filter params to the server
const createFetchGamesFunction = (
  endpoint: string | undefined,
  query: string | undefined,
  filters?: GameFilters,
) => async (): Promise<Game[]> => {
  const url = endpoint ? `${SERVER_URL}${endpoint}` : `${SERVER_URL}/search`;
  const params: Record<string, string> = {};
  if (query) params.q = query;
  if (filters?.year) params.year = filters.year;
  if (filters?.genre) params.genre = filters.genre;
  if (filters?.platform) params.platform = filters.platform;
  if (filters?.sort) params.sort = filters.sort;
  const response = await axios.get<Game[]>(url, { params });
  return response.data;
};

function getRatingColor(rating: number): string {
  if (rating <= 2) return "#8B0000";
  if (rating <= 4) return "#FF4C4C";
  if (rating <= 6) return "#FFA500";
  if (rating <= 8) return "#71e047";
  return "#006400";
}

// Card
interface GameCardProps {
  item: Game;
}
const GameCard = React.memo<GameCardProps>(({ item }) => {
  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const { t } = useTranslation();

  const labelKey = `games.list.gameTypes.${item.game_type}`;
  const label = t(labelKey);
  const validTypes = [1, 2, 5, 6, 7, 8, 9, 10];
  const shouldShowLabel = validTypes.includes(item.game_type ?? -1);

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
        allowDownscaling={true}
      />
      {shouldShowLabel && <Text style={styles.gameType}>{label}</Text>}
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

// main
interface GamesListProps {
  endpoint?: string;
  query?: string;
  header?: string;
  filters?: GameFilters;
  onBack?: () => void;
}

function GamesList({ endpoint, query, header, filters, onBack }: GamesListProps) {
  const { t } = useTranslation();

  const safeEndpoint = (endpoint ?? "search").replace(/\//g, "_");
  const safeQuery = (query ?? "all").replace(/\s/g, "_");
  // Cache key includes filter values so different filter combos don't share cache
  const safeFilters = `${filters?.year ?? ""}_${filters?.genre ?? ""}_${filters?.platform ?? ""}_${filters?.sort ?? ""}`;
  const STORAGE_KEY = `GAMES_CACHE_${safeEndpoint}_${safeQuery}_${safeFilters}`;

  // FIX: use primitive filter values as deps to avoid re-fetching on object reference changes
  const fetchGames = useCallback(
    createFetchGamesFunction(endpoint, query, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, query, filters?.year, filters?.genre, filters?.platform, filters?.sort],
  );

  const { data: games, isLoading, isRefetching, error, refetch } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchGames,
    // FIX: use primitive values not the filters object reference
    [endpoint, query, filters?.year, filters?.genre, filters?.platform, filters?.sort],
  );

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => <GameCard item={item} />,
    [],
  );

  // FIX: numColumns must be 1 when horizontal, 2 when vertical grid
  const isHorizontal = !!endpoint;
  const numColumns = (!isHorizontal && query !== undefined) ? 2 : isHorizontal ? 1 : 2;

  const getItemLayout = useCallback(
    (_data: ArrayLike<Game> | null | undefined, index: number) => {
      if (isHorizontal) {
        return { length: CARD_WIDTH, offset: CARD_WIDTH * index, index };
      }
      // FIX: use the computed numColumns in layout calculation
      return {
        length: CARD_HEIGHT,
        offset: CARD_HEIGHT * Math.floor(index / numColumns),
        index,
      };
    },
    [isHorizontal, numColumns],
  );

  const renderListHeader = useCallback(() => {
    if (!onBack) return null;
    return (
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
    );
  }, [onBack]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const refreshControl = !isHorizontal ? (
    <RefreshControl
      refreshing={isRefetching && !isActuallyLoading}
      onRefresh={handleRefresh}
      tintColor={COLORS.secondary}
      colors={[COLORS.secondary]}
    />
  ) : undefined;

  return (
    <View style={styles.container}>
      {/* FIX: skeleton – no numColumns on horizontal list */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 6 }, (_, i) => ({ id: i } as any))}
          horizontal={isHorizontal}
          numColumns={isHorizontal ? undefined : 2}
          key={isHorizontal ? "skeleton-horiz" : "skeleton-grid"}
          renderItem={() => <SkeletonGameCard />}
          showsHorizontalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
        />
      )}

      {error && gamesToShow.length === 0 && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{t("games.list.serverError")}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>{t("common.retryButton")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isActuallyLoading &&
        gamesToShow.length === 0 &&
        (query || endpoint) &&
        !error && (
          <>
            {renderListHeader()}
            <Text style={styles.noResults}>{t("games.list.noResults")}</Text>
          </>
        )}

      {gamesToShow.length > 0 && (
        <>
          {header && <Text style={styles.header}>{header}</Text>}
          <FlatList
            data={gamesToShow}
            horizontal={isHorizontal}
            // FIX: don't apply numColumns on horizontal list
            numColumns={isHorizontal ? undefined : numColumns}
            key={isHorizontal ? "horiz" : `grid-${numColumns}`}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            refreshControl={refreshControl}
          />
        </>
      )}
    </View>
  );
}
// FIX: wrap with React.memo to avoid unnecessary re-renders
export default React.memo(GamesList);

const styles = StyleSheet.create({
  container: {},
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
  header: { fontSize: 28, color: "white", margin: 12, fontWeight: "bold" },
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
  errorContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  error: {
    color: "#ffcccc",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
    alignItems: "center", paddingBottom: 220,
  },
});