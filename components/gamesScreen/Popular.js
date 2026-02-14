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
import SkeletonPopular from "../../skeleton/SkeletonPopular";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 5;

// دالة جلب الألعاب الشعبية
const fetchPopularGames = async () => {
  const response = await axios.get(`${SERVER_URL}/popular`);
  return response.data;
};

// دالة تنسيق عدد المتابعين
const formatFollows = (count) => {
  if (!count) return "";
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const PopularCard = React.memo(({ item, index }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;
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
      {/* خلفية متدرجة */}
      <LinearGradient
        colors={["#172a4a", "#0c1a33"]}
        style={styles.cardBackground}
      />

      {/* صورة الغلاف */}
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

        {/* Gradient overlay image*/}
        <LinearGradient
          colors={["transparent", COLORS.darkBackground]}
          style={styles.coverGradient}
        />

        {/* Trend Badge */}
        <View style={styles.trendBadge}>
          <Text style={styles.trendRank}>#{rank}</Text>
        </View>
      </View>

      {/* معلومات اللعبة */}
      <View style={styles.infoContainer}>
        {/* game title */}
        <Text style={styles.title} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.statsContainer}>
          {/* rating */}
          {rating > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
            </View>
          )}

          {/* المنصات */}
          {item.platforms && item.platforms.length > 0 && (
            <View style={styles.platformsContainer}>
              {item.platforms.slice(0, 3).map((platform, idx) => (
                <View key={idx} style={styles.platformChip}>
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

export default function PopularGames() {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_POPULAR";

  // استخدام Hook الكاش المحسّن
  const {
    data: games,
    isLoading,
    error,
  } = useCachedData(STORAGE_KEY, fetchPopularGames, []);

  // البيانات المعروضة
  const gamesToShow = games || [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item, index }) => <PopularCard item={item} index={index} />,
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
    <View>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t("games.list.popular")}</Text>
      </View>

      {/* Skeleton Loading */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 5 }).map((_, i) => ({ id: i }))}
          horizontal
          renderItem={() => <SkeletonPopular />}
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
    justifyContent: "space-between",
    margin: 18,
  },
  header: {
    fontSize: 28,
    color: COLORS.textLight,
    fontWeight: "bold",
  },
  gameCard: {
    width: 165,
    height: 300,
    marginHorizontal: 5,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  coverContainer: {
    width: "100%",
    height: 190,
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
    height: "60%",
  },
  trendBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(12, 26, 51, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  trendRank: {
    color: COLORS.lightGray,
    fontSize: 13,
    fontWeight: "bold",
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  statItem: {
    flexDirection: "row",
    // alignSelf: "flex-end",
    backgroundColor: "rgba(119, 155, 221, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray + "99",
  },
  statIcon: {
    fontSize: 12,
  },
  statValue: {
    color: COLORS.lightGray,
    fontSize: 12,
    fontWeight: "bold",
  },
  platformsContainer: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  platformChip: {
    backgroundColor: "rgba(81, 105, 150, 0.3)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#516996",
  },
  platformText: {
    color: "#9CB4DD",
    fontSize: 10,
    fontWeight: "600",
  },
  error: {
    color: COLORS.lightGray,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
