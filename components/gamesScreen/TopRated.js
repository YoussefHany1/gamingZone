import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonTopRated from "../../skeleton/SkeletonTopRated";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_MARGIN = 5;

// دالة جلب الألعاب الأعلى تقييماً
const fetchTopRatedGames = async () => {
  const response = await axios.get(`${SERVER_URL}/top-rated`);
  return response.data;
};

// دالة الحصول على لون التقييم
function getRatingColor(rating) {
  if (rating <= 2) return ["#8B0000", "#B22222"];
  if (rating <= 4) return ["#FF4C4C", "#FF6B6B"];
  if (rating <= 6) return ["#FF8C00", "#FFA500"];
  if (rating <= 8) return ["#7CB342", "#8BC34A"];
  return ["#2E7D32", "#4CAF50"];
}

// دالة الحصول على الميدالية
const getMedalEmoji = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const TopRatedCard = React.memo(({ item, index }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;
  const ratingColors = getRatingColor(rating);
  const rank = index + 1;

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

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
      {/* Rank Badge */}
      {rank <= 3 && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{getMedalEmoji(rank)}</Text>
        </View>
      )}

      {/* game cover */}
      <View style={styles.coverContainer}>
        <Image
          recyclingKey={item?.cover?.image_id || ""}
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

        {/* Gradient overlay image*/}
        <LinearGradient
          colors={["transparent", COLORS.darkBackground]}
          style={styles.coverGradient}
        />
      </View>

      {/* game info */}
      <View style={styles.infoContainer}>
        {/* game title */}
        <Text style={styles.title} numberOfLines={2}>
          {item.name} {/* release year */}
          {item.first_release_date && (
            <View style={styles.yearContainer}>
              <Text style={styles.yearText}>
                {new Date(item.first_release_date * 1000).getFullYear()}
              </Text>
            </View>
          )}
        </Text>

        {/* rating */}
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

          {/* genres */}
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

      {/* Border glow effect */}
      {rank <= 3 && (
        <LinearGradient
          colors={
            rank === 1
              ? ["#FFD700", "#FFA500", "transparent"]
              : rank === 2
                ? ["#C0C0C0", "#808080", "transparent"]
                : ["#CD7F32", "#8B4513", "transparent"]
          }
          style={styles.glowBorder}
        />
      )}
    </TouchableOpacity>
  );
});

export default function TopRatedGames() {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_TOP_RATED";

  // استخدام Hook الكاش المحسّن
  const {
    data: games,
    isLoading,
    error,
  } = useCachedData(STORAGE_KEY, fetchTopRatedGames, []);

  // البيانات المعروضة
  const gamesToShow = games || [];
  const isActuallyLoading =
    isLoading && (gamesToShow.length === 0 || !gamesToShow);

  const renderItem = useCallback(
    ({ item, index }) => <TopRatedCard item={item} index={index} />,
    [],
  );

  const getItemLayout = useCallback(
    (data, index) => ({
      length: CARD_WIDTH + CARD_MARGIN * 2,
      offset: (CARD_WIDTH + CARD_MARGIN * 2) * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t("games.list.topRated")}</Text>
      </View>

      {/* Skeleton Loading */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 5 }).map((_, i) => ({ id: i }))}
          horizontal
          renderItem={() => <SkeletonTopRated />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Error Message */}
      {error && gamesToShow.length === 0 && (
        <Text style={styles.error}>{t("games.list.serverError")}</Text>
      )}

      {/* No Results */}
      {!isActuallyLoading && gamesToShow.length === 0 && !error && (
        <Text style={styles.noResults}>{t("games.list.noResults")}</Text>
      )}

      {/* Games List */}
      {gamesToShow.length > 0 && (
        <FlatList
          data={gamesToShow}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    margin: 18,
  },
  header: {
    fontSize: 28,
    color: COLORS.textLight,
    fontWeight: "bold",
  },
  cardBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
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
  rankText: {
    fontSize: 24,
  },
  coverContainer: {
    width: "100%",
    height: 160,
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
    height: "50%",
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    // gap: 8,
    justifyContent: "space-between",
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
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
  ratingNumber: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
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
  starIcon: {
    fontSize: 10,
  },
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
  genreText: {
    color: "#A0B0FF",
    fontSize: 11,
    fontWeight: "600",
  },
  yearContainer: {
    backgroundColor: "rgba(100, 100, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yearText: {
    color: "#999",
    fontSize: 11,
    fontWeight: "600",
  },
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
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
