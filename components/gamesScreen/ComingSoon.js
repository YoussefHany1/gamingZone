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
import { Ionicons } from "@expo/vector-icons";

const CARD_WIDTH = 300;
const CARD_MARGIN = 10;

// دالة جلب الألعاب القادمة
const fetchComingSoonGames = async () => {
  const response = await axios.get(`${SERVER_URL}/coming-soon`);
  return response.data;
};

// دالة حساب الأيام المتبقية
const getDaysUntilRelease = (timestamp) => {
  if (!timestamp) return null;
  const releaseDate = new Date(timestamp * 1000);
  const today = new Date();
  const diffTime = releaseDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// دالة الحصول على الشهر واليوم
const getDateParts = (timestamp) => {
  const { i18n } = useTranslation();
  if (!timestamp) return { month: "", day: "" };
  const date = new Date(timestamp * 1000);
  const month = date.toLocaleDateString(i18n.language, { month: "short" });
  const day = date.getDate();
  return { month, day };
};

const ComingSoonCard = React.memo(({ item }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const daysUntil = getDaysUntilRelease(item.first_release_date);
  const { month, day } = getDateParts(item.first_release_date);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* game background image */}
      <Image
        source={
          item.cover
            ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${item.cover.image_id}.jpg`
            : require("../../assets/image-not-found.webp")
        }
        style={styles.backgroundImage}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={["transparent", COLORS.primary]}
        style={styles.gradient}
      />

      {/* card content */}
      <View style={styles.cardContent}>
        {/* date calendar */}
        <View style={styles.dateCalendar}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarMonth}>{month}</Text>
          </View>
          <View style={styles.calendarBody}>
            <Text style={styles.calendarDay}>{day}</Text>
          </View>
        </View>

        {/* Hype Badge */}
        {item.hypes && item.hypes > 0 && (
          <View style={styles.hypeBadgeContainer}>
            <LinearGradient
              colors={["#FF512F", "#DD2476"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hypeGradient}
            >
              <Ionicons
                name="flame"
                size={14}
                color="white"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.hypeBadgeText}>{item.hypes}</Text>
            </LinearGradient>
          </View>
        )}

        {/* game cover */}
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
        </View>

        {/* game info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>

          {/* platforms */}
          {item.platforms && item.platforms.length > 0 && (
            <View style={styles.platformsContainer}>
              {item.platforms.slice(0, 4).map((platform, index) => (
                <View key={index} style={styles.platformBadge}>
                  <Text style={styles.platformText} numberOfLines={1}>
                    {platform.abbreviation || platform.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ComingSoonGames() {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_COMING_SOON";

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
    queryKey: ["games", "coming-soon"],
    queryFn: fetchComingSoonGames,
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
    ({ item }) => <ComingSoonCard item={item} />,
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
        <Text style={styles.header}>{t("games.list.comingSoon")}</Text>
      </View>

      {/* Skeleton Loading */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 3 }).map((_, i) => ({ id: i }))}
          horizontal
          renderItem={() => <SkeletonGameCard />}
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
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          pagingEnabled={false}
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
    width: CARD_WIDTH,
    height: 350,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.secondary,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  dateCalendar: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 55,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  calendarHeader: {
    backgroundColor: COLORS.darkBackground,
    paddingVertical: 4,
    alignItems: "center",
  },
  calendarMonth: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  calendarBody: {
    backgroundColor: "white",
    paddingVertical: 5,
    alignItems: "center",
  },
  calendarDay: {
    color: COLORS.darkBackground,
    fontSize: 25,
    fontWeight: "bold",
  },
  coverContainer: {
    alignSelf: "center",
    marginBottom: 20,
  },
  cover: {
    width: 140,
    height: 200,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  infoContainer: {
    gap: 12,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  platformsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  platformBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  platformText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
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
  hypeBadgeContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#FF512F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    overflow: "hidden",
  },
  hypeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hypeBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
