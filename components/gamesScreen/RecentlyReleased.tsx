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
import { useNavigation, NavigationProp } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import ErrorState from "../ErrorState";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonRecentlyReleased from "../../skeleton/SkeletonRecentlyReleased";
import COLORS from "../../constants/colors";
import SectionTitle from "../SectionTitle";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";
import { Game } from "../types";


const CARD_HEIGHT = 200;

// Helpers

const fetchRecentlyReleasedGames = async (): Promise<Game[]> => {
  const response = await axios.get<Game[]>(`${SERVER_URL}/recently-released`);
  return response.data;
};

const formatReleaseDate = (timestamp: number | null | undefined, locale: string): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// rating color gradient based on score (0-10)
function getRatingColor(rating: number): [string, string] {
  if (rating <= 2) return ["#8B0000", "#B22222"];
  if (rating <= 4) return ["#FF4C4C", "#FF6B6B"];
  if (rating <= 6) return ["#FF8C00", "#FFA500"];
  if (rating <= 8) return ["#7CB342", "#8BC34A"];
  return ["#2E7D32", "#4CAF50"];
}

// Card

interface RecentGameCardProps {
  item: Game;
}

const RecentGameCard = React.memo<RecentGameCardProps>(({ item }) => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { t, i18n } = useTranslation();

  // Derive how many days ago the game was released
  const daysSince: number | null = item.first_release_date
    ? Math.ceil(
      Math.abs(Date.now() - item.first_release_date * 1000) /
      (1000 * 60 * 60 * 24),
    )
    : null;

  const isNew = daysSince !== null && daysSince <= 7;

  const handlePress = useCallback((): void => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["#1a3052", COLORS.darkBackground]}
        style={styles.cardGradient}
      />

      <View style={styles.cardContent}>
        {/* Cover + rating badge */}
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

          {item.total_rating != null && (
            <LinearGradient
              colors={getRatingColor(item.total_rating / 10)}
              style={styles.ratingBadge}
            >
              <Text style={styles.ratingText}>
                {(Math.round(item.total_rating) / 10).toFixed(1)}
              </Text>
              <Text style={styles.ratingIcon}>⭐</Text>
            </LinearGradient>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.releaseDateContainer}>
            <Text style={styles.releaseDate}>
              {formatReleaseDate(item.first_release_date, i18n.language)}
            </Text>
          </View>

          {item.genres && item.genres.length > 0 && (
            <Text style={{ color: COLORS.lightGray, fontSize: 13 }} numberOfLines={1}>
              {item.genres.map((g) => g.name).join(" · ")}
            </Text>
          )}

          {/* "NEW" badge visible for games released within the last 7 days */}
          {isNew && <Text style={styles.newBadgeText}>{t("games.list.recentlyReleased.new")}</Text>}

          {item.platforms && item.platforms.length > 0 && (
            <View style={styles.platformsContainer}>
              <Text style={styles.platformsText} numberOfLines={1}>
                {item.platforms
                  .slice(0, 3)
                  .map((p) => p.abbreviation ?? p.name)
                  .join(" · ")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// main

function RecentlyReleasedGames(): React.ReactElement {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_RECENTLY_RELEASED";

  const { data: games, isLoading, error } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchRecentlyReleasedGames,
    [],
  );

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => <RecentGameCard item={item} />,
    [],
  );

  const getItemLayout = useCallback(
    (
      _data: ArrayLike<Game> | null | undefined,
      index: number,
    ): { length: number; offset: number; index: number } => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View>
      <View style={styles.headerContainer}>
        <SectionTitle title={t("games.list.recentlyReleased.title")} subtitle={t("games.list.recentlyReleased.subtitle")} fontSize={28} />
      </View>

      {/* Skeleton while loading with no cached data */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
          keyExtractor={(item) => String(item.id)}
          renderItem={() => <SkeletonRecentlyReleased />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
      {/* error */}
      {(error || !Array.isArray(gamesToShow)) && (
        <View style={{ width: "100%", height: CARD_HEIGHT }}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {!error && Array.isArray(gamesToShow) && (
        <FlatList
          data={gamesToShow}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={{ width: "100%", height: CARD_HEIGHT }}>
            <ErrorState message={t("games.list.serverError")} />
          </View>}
        />
      )}
    </View>
  );
}
export default RecentlyReleasedGames;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    margin: 18,
  },
  gameCard: {
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
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
    backgroundColor: "#00001c",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  ratingText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  ratingIcon: { fontSize: 11 },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    lineHeight: 21,
    marginBottom: 8,
  },
  releaseDateContainer: {},
  releaseDate: { color: COLORS.lightGray, fontSize: 13, fontWeight: "bold" },
  newBadgeText: {
    position: "absolute",
    top: 0,
    right: 0,
    color: "#90b7ff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  platformsContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  platformsText: { color: COLORS.lightGray, fontSize: 13, flex: 1 },
  error: {
    color: "#779bdd",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  noResults: {
    color: "#9CB4DD",
    textAlign: "center",
    fontSize: 16,
    marginVertical: 20,
  },
  listContent: { paddingBottom: 20 },
});