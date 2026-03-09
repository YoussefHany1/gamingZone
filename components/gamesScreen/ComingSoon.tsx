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
import { LinearGradient } from "expo-linear-gradient";
import SkeletonComingSoon from "../../skeleton/SkeletonComingSoon";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useCountdown } from "../../hooks/useCountdown";
import useCachedData from "../../hooks/useCachedData";
import { Game, CountdownResult } from "../types";

const CARD_WIDTH = 300;
const CARD_MARGIN = 10;

const fetchComingSoonGames = async (): Promise<Game[]> => {
  const response = await axios.get<Game[]>(`${SERVER_URL}/coming-soon`);
  return response.data;
};

// Return the short month name and day number for a Unix timestamp
const getDateParts = (
  timestamp: number | undefined,
  language: string,
): { month: string; day: number | string } => {
  if (!timestamp) return { month: "", day: "" };
  const date = new Date(timestamp * 1000);
  const month = date.toLocaleDateString(language, { month: "short" });
  const day = date.getDate();
  return { month, day };
};

// Card

interface ComingSoonCardProps {
  item: Game;
}

const ComingSoonCard = React.memo<ComingSoonCardProps>(({ item }) => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();

  const timeLeft = useCountdown(item.first_release_date) as CountdownResult | null;
  const { month, day } = getDateParts(item.first_release_date, i18n.language);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Background screenshot */}
      <Image
        source={
          item.cover
            ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${item.cover.image_id}.webp`
            : require("../../assets/image-not-found.webp")
        }
        style={styles.backgroundImage}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
      />

      <LinearGradient
        colors={["transparent", COLORS.primary]}
        style={styles.gradient}
      />

      <View style={styles.cardContent}>
        {/* Release date calendar widget */}
        <View style={styles.dateCalendar}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarMonth}>{month}</Text>
          </View>
          <View style={styles.calendarBody}>
            <Text style={styles.calendarDay}>{day}</Text>
          </View>
        </View>

        {/* Hype badge */}
        {item.hypes != null && item.hypes > 0 && (
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

        {/* Cover art */}
        <View style={styles.coverContainer}>
          <Image
            recyclingKey={item.cover?.image_id ?? ""}
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
        </View>

        {/* Game info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>

          {item.platforms && item.platforms.length > 0 && (
            <View style={styles.platformsContainer}>
              {item.platforms.slice(0, 4).map((platform, index) => (
                <View key={index} style={styles.platformBadge}>
                  <Text style={styles.platformText} numberOfLines={1}>
                    {platform.abbreviation ?? platform.name}
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

// main
function ComingSoonGames(): React.ReactElement {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_COMING_SOON";

  const { data: games, isLoading, error } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchComingSoonGames,
    [],
  );

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => <ComingSoonCard item={item} />,
    [],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Game> | null | undefined, index: number) => ({
      length: CARD_WIDTH + CARD_MARGIN * 2,
      offset: (CARD_WIDTH + CARD_MARGIN * 2) * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t("games.list.comingSoon")}</Text>
      </View>

      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 3 }, (_, i) => ({ id: i } as any))}
          horizontal
          renderItem={() => <SkeletonComingSoon />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {error && gamesToShow.length === 0 && (
        <Text style={styles.error}>{t("games.list.serverError")}</Text>
      )}

      {!isActuallyLoading && gamesToShow.length === 0 && !error && (
        <Text style={styles.noResults}>{t("games.list.noResults")}</Text>
      )}

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
export default ComingSoonGames;

const styles = StyleSheet.create({
  container: {},
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
  },
  infoContainer: { gap: 12 },
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
  platformText: { color: "white", fontSize: 12, fontWeight: "600" },
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
  hypeBadgeContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  hypeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hypeBadgeText: { color: "white", fontSize: 12, fontWeight: "bold" },
});