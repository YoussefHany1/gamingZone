import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ListRenderItemInfo,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import ErrorState from "../ErrorState";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonTopRated from "../../skeleton/SkeletonTopRated";
import COLORS from "../../constants/colors";
import SectionTitle from "../SectionTitle";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";
import { Game } from "../types";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_MARGIN = 5;

// Helpers
const fetchTopRatedGames = async (): Promise<Game[]> => {
  const response = await axios.get<Game[]>(`${SERVER_URL}/top-rated`);
  return response.data;
};
// rating color
function getRatingColor(rating: number): [string, string] {
  if (rating <= 2) return ["#8B0000", "#B22222"];
  if (rating <= 4) return ["#FF4C4C", "#FF6B6B"];
  if (rating <= 6) return ["#FF8C00", "#FFA500"];
  if (rating <= 8) return ["#7CB342", "#8BC34A"];
  return ["#2E7D32", "#4CAF50"];
}
//  medal emojis for top 3 games
const getMedalEmoji = (rank: number): string => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

// Card

interface TopRatedCardProps {
  item: Game;
  index: number;
}

const TopRatedCard = React.memo<TopRatedCardProps>(({ item, index }) => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

  const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;
  const ratingColors = getRatingColor(rating);
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
    <TouchableOpacity
      style={styles.gameCard}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["transparent", COLORS.darkBackground + "AA"]}
        style={styles.cardBackground}
      />

      {/* Medal badge for top-3 */}
      {rank <= 3 && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{getMedalEmoji(rank)}</Text>
        </View>
      )}

      {/* Cover image */}
      <View style={styles.coverContainer}>
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
        <LinearGradient
          colors={["transparent", COLORS.darkBackground]}
          style={styles.coverGradient}
        />
      </View>

      {/* Game info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {item.name}{" "}
          {item.first_release_date && (
            <View style={styles.yearContainer}>
              <Text style={styles.yearText}>
                {new Date(item.first_release_date * 1000).getFullYear()}
              </Text>
            </View>
          )}
        </Text>

        {/* Rating circle + genre badges */}
        <View style={styles.ratingMainContainer}>
          <LinearGradient
            colors={ratingColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ratingCircle}
          >
            <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
            <View style={styles.starContainer}>
              <Text style={styles.starIcon}>⭐</Text>
            </View>
          </LinearGradient>

          {item.genres && item.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {item.genres.slice(0, 2).map((genre, idx) => (
                <View key={idx} style={styles.genreBadge}>
                  <Text style={styles.genreText} numberOfLines={1}>
                    {genre.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Coloured border glow for top-3 */}
      {rank <= 3 && (
        <LinearGradient colors={glowColors} style={styles.glowBorder} />
      )}
    </TouchableOpacity>
  );
});

// main

export default function TopRatedGames(): React.ReactElement {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_TOP_RATED";

  const { data: games, isLoading, error } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchTopRatedGames,
    [],
  );

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Game>) => (
      <TopRatedCard item={item} index={index} />
    ),
    [],
  );

  const getItemLayout = useCallback(
    (
      _data: ArrayLike<Game> | null | undefined,
      index: number,
    ): { length: number; offset: number; index: number } => ({
      length: CARD_WIDTH + CARD_MARGIN * 2,
      offset: (CARD_WIDTH + CARD_MARGIN * 2) * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle title={t("games.list.topRated.title")} subtitle={t("games.list.topRated.subtitle")} fontSize={28} />
      </View>

      {/* Skeleton while loading with no cached data */}
      {isActuallyLoading && (
        <FlashList
          data={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={() => <SkeletonTopRated />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={210}
        />
      )}
      {/* error */}
      {(error || !Array.isArray(gamesToShow)) && (
        <View style={{ width: "100%", height: CARD_HEIGHT }}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {!error && Array.isArray(gamesToShow) && (
        <FlashList
          data={gamesToShow}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={{ width: "100%", height: CARD_HEIGHT }}>
            <ErrorState message={t("games.list.serverError")} />
          </View>}
          estimatedItemSize={210}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    margin: 18,
  },
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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    elevation: 6,
    shadowColor: "#000",
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
  title: { color: "white", fontSize: 16, fontWeight: "bold", lineHeight: 20 },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  ratingNumber: { color: "white", fontSize: 20, fontWeight: "bold" },
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
    backgroundColor: "rgba(100, 100, 255, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(100, 100, 255, 0.3)",
  },
  genreText: { color: "#A0B0FF", fontSize: 11, fontWeight: "600" },
  yearContainer: {
    backgroundColor: "rgba(100, 100, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yearText: { color: "#999", fontSize: 11, fontWeight: "600" },
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
  listContent: { paddingHorizontal: 10, paddingVertical: 5 },
});