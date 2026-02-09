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
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonGameCard from "../../skeleton/SkeletonGameCard";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";

const CARD_HEIGHT = 200;

// دالة جلب الألعاب الصادرة حديثاً
const fetchRecentlyReleasedGames = async () => {
  const response = await axios.get(`${SERVER_URL}/recently-released`);
  return response.data;
};

// دالة تنسيق التاريخ
const formatReleaseDate = (timestamp) => {
  if (!timestamp) return "";
  const { i18n } = useTranslation();
  const date = new Date(timestamp * 1000);
  const options = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString(i18n.language, options);
};

// دالة حساب عدد الأيام منذ الإصدار
const getDaysSinceRelease = (timestamp) => {
  if (!timestamp) return null;
  const releaseDate = new Date(timestamp * 1000);
  const today = new Date();
  const diffTime = Math.abs(today - releaseDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// دالة الحصول على ألوان التقييم
function getRatingColor(rating) {
  if (rating <= 2) return ["#8B0000", "#B22222"];
  if (rating <= 4) return ["#FF4C4C", "#FF6B6B"];
  if (rating <= 6) return ["#FF8C00", "#FFA500"];
  if (rating <= 8) return ["#7CB342", "#8BC34A"];
  return ["#2E7D32", "#4CAF50"];
}

const RecentGameCard = React.memo(({ item }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const daysSince = getDaysSinceRelease(item.first_release_date);
  const isNew = daysSince && daysSince <= 7;

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
        colors={["#1a3052", COLORS.darkBackground]}
        style={styles.cardGradient}
      />

      <View style={styles.cardContent}>
        {/* Cover Container */}
        <View style={styles.coverContainer}>
          <Image
            source={
              item.cover
                ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg`
                : require("../../assets/image-not-found.webp")
            }
            style={styles.cover}
            contentFit="cover"
            transition={500}
            cachePolicy="memory-disk"
          />

          {/* Rating Badge */}
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

        {/* Info Container */}
        <View style={styles.infoContainer}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Release Date */}
          <View style={styles.releaseDateContainer}>
            <Text style={styles.releaseDate}>
              {formatReleaseDate(item.first_release_date)}
            </Text>
          </View>

          {/* genres */}
          <View>
            {item.genres && item.genres.length > 0 && (
              <Text
                style={{ color: COLORS.lightGray, fontSize: 13 }}
                numberOfLines={1}
              >
                {item.genres.map((g) => g.name).join(" · ")}
              </Text>
            )}
          </View>

          {/* New Badge */}
          {isNew && <Text style={styles.newBadgeText}>{t("NEW")}</Text>}

          {/* Platforms */}
          {item.platforms && item.platforms.length > 0 && (
            <View style={styles.platformsContainer}>
              <Text style={styles.platformsText} numberOfLines={1}>
                {item.platforms
                  .slice(0, 3)
                  .map((p) => p.abbreviation || p.name)
                  .join(" · ")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function RecentlyReleasedGames() {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_RECENTLY_RELEASED";

  // حالة محلية للكاش
  const [cachedGames, setCachedGames] = useState([]);

  // تحميل الكاش عند فتح الشاشة
  useEffect(() => {
    const loadCache = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          setCachedGames(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error("Failed to load cache", e);
      }
    };
    loadCache();
  }, []);

  // React Query لجلب البيانات
  const {
    data: freshGames,
    isLoading,
    error,
    isSuccess,
  } = useQuery({
    queryKey: ["games", "recently-released"],
    queryFn: fetchRecentlyReleasedGames,
    staleTime: 1000 * 60 * 30, // 30 دقيقة
    retry: 1,
  });

  // تحديث الكاش عند وصول بيانات جديدة
  useEffect(() => {
    if (isSuccess && freshGames && freshGames.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshGames)).catch((e) =>
        console.error(e),
      );
    }
  }, [isSuccess, freshGames]);

  // دمج البيانات
  const gamesToShow =
    freshGames && freshGames.length > 0 ? freshGames : cachedGames;
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item }) => <RecentGameCard item={item} />,
    [],
  );

  const getItemLayout = useCallback(
    (data, index) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t("games.list.recentlyReleased")}</Text>
      </View>

      {/* Skeleton Loading */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 5 }).map((_, i) => ({ id: i }))}
          renderItem={() => <SkeletonGameCard />}
          showsVerticalScrollIndicator={false}
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
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          showsVerticalScrollIndicator={false}
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
  cardGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
  },
  coverContainer: {
    width: 110,
    height: 150,
    position: "relative",
  },
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
  ratingText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  ratingIcon: {
    fontSize: 11,
  },
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
  releaseDate: {
    color: COLORS.lightGray,
    fontSize: 13,
    fontWeight: "bold",
  },
  newBadgeText: {
    position: "absolute",
    top: 0,
    right: 0,
    color: "#90b7ff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  platformsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  platformsText: {
    color: COLORS.lightGray,
    fontSize: 13,
    flex: 1,
  },
  freshBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  freshBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
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
  listContent: {
    paddingBottom: 20,
  },
});
