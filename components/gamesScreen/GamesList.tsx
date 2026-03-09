import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ListRenderItemInfo,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import SkeletonGameCard from "../../skeleton/SkeletonGameCard";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";
import { Game } from "../types";

const CARD_HEIGHT = 290;
const CARD_WIDTH = 180;

// Factory that creates a typed fetch function for a given endpoint/query pair
const createFetchGamesFunction = (
  endpoint: string | undefined,
  query: string | undefined,
) => async (): Promise<Game[]> => {
  const url = endpoint ? `${SERVER_URL}${endpoint}` : `${SERVER_URL}/search`;
  const params = query ? { q: query } : {};
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
  const navigation = useNavigation<any>();
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

// main
interface GamesListProps {
  endpoint?: string;
  query?: string;
  header?: string;
}

function GamesList({ endpoint, query, header }: GamesListProps) {
  const { t } = useTranslation();

  const safeEndpoint = (endpoint ?? "search").replace(/\//g, "_");
  const safeQuery = (query ?? "all").replace(/\s/g, "_");
  const STORAGE_KEY = `GAMES_CACHE_${safeEndpoint}_${safeQuery}`;

  const fetchGames = useCallback(
    createFetchGamesFunction(endpoint, query),
    [endpoint, query],
  );

  const { data: games, isLoading, error } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchGames,
    [endpoint, query],
  );

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => <GameCard item={item} />,
    [],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Game> | null | undefined, index: number) => {
      const isHorizontal = !!endpoint;
      const numColumns = query ? 2 : 1;
      if (isHorizontal) {
        return { length: CARD_WIDTH, offset: CARD_WIDTH * index, index };
      }
      return {
        length: CARD_HEIGHT,
        offset: CARD_HEIGHT * Math.floor(index / numColumns),
        index,
      };
    },
    [endpoint, query],
  );

  return (
    <View style={styles.container}>
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 6 }, (_, i) => ({ id: i } as any))}
          horizontal={!!endpoint}
          numColumns={query ? 2 : 1}
          key={query ? "skeleton-grid" : "skeleton-list"}
          renderItem={() => <SkeletonGameCard />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingVertical: 12,
            paddingHorizontal: 5,
            ...(query && { alignItems: "center", paddingBottom: 320 }),
          }}
        />
      )}

      {error && gamesToShow.length === 0 && (
        <Text style={styles.error}>{t("games.list.serverError")}</Text>
      )}

      {!isActuallyLoading &&
        gamesToShow.length === 0 &&
        (query || endpoint) &&
        !error && (
          <Text style={styles.noResults}>{t("games.list.noResults")}</Text>
        )}

      {gamesToShow.length > 0 && (
        <>
          {header && <Text style={styles.header}>{header}</Text>}
          <FlatList
            data={gamesToShow}
            horizontal={!!endpoint}
            numColumns={query ? 2 : 1}
            key={query ? "grid" : "list"}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              query ? { alignItems: "center", paddingBottom: 220 } : undefined,
            ]}
          />
        </>
      )}
    </View>
  );
}
export default GamesList

const styles = StyleSheet.create({
  container: {},
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
  error: {
    color: "#ffcccc",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    fontSize: 16,
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
  },
});