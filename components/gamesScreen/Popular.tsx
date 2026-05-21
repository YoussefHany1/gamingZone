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
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import ErrorState from "../ErrorState";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonPopular from "../../skeleton/SkeletonPopular";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import useCachedData from "../../hooks/useCachedData";
import { Game } from "../types";
import SectionTitle from "../SectionTitle";

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 5;

const fetchPopularGames = async (): Promise<Game[]> => {
  const response = await axios.get<Game[]>(`${SERVER_URL}/popular`);
  return response.data;
};

// Card

interface PopularCardProps {
  item: Game;
  index: number;
}

const PopularCard = React.memo<PopularCardProps>(({ item, index }) => {
  const navigation = useNavigation<any>();

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
      <LinearGradient
        colors={["#172a4a", "#0c1a33"]}
        style={styles.cardBackground}
      />

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
        <LinearGradient
          colors={["transparent", COLORS.darkBackground]}
          style={styles.coverGradient}
        />
        {/* Rank badge */}
        <View style={styles.trendBadge}>
          <Text style={styles.trendRank}>#{rank}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.statsContainer}>
          {rating > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
            </View>
          )}
          {item.platforms && item.platforms.length > 0 && (
            <View style={styles.platformsContainer}>
              {item.platforms.slice(0, 3).map((platform, idx) => (
                <View key={idx} style={styles.platformChip}>
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

function PopularGames(): React.ReactElement {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_POPULAR";

  const { data: games, isLoading, error } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchPopularGames,
    [],
  );

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Game>) => (
      <PopularCard item={item} index={index} />
    ),
    [],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Game> | null | undefined, index: number) => ({
      length: CARD_WIDTH + CARD_MARGIN * 2,
      offset: (CARD_WIDTH + CARD_MARGIN * 2) * index,
      index,
    }),
    [],
  );

  return (
    <View>
      <View style={styles.headerContainer}>
        <SectionTitle title={t("games.list.popular.title")} fontSize={28} subtitle={t("games.list.popular.subtitle")} />
      </View>

      {isActuallyLoading && (
        <FlashList
          data={Array.from({ length: 5 }, (_, i) => ({ id: i } as any))}
          horizontal
          renderItem={() => <SkeletonPopular />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={175}
        />
      )}
      {/* error */}
      {(error || !Array.isArray(gamesToShow)) && (
        <View style={{ width: "100%", height: CARD_HEIGHT }}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {!error && Array.isArray(gamesToShow) && !isActuallyLoading && (
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
          estimatedItemSize={175}
        />
      )}
    </View>
  );
}
export default PopularGames

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    margin: 18,
  },
  gameCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: 5,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardBackground: { position: "absolute", width: "100%", height: "100%" },
  coverContainer: { width: "100%", height: 190, position: "relative" },
  cover: { width: "100%", height: "100%" },
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
  trendRank: { color: COLORS.lightGray, fontSize: 13, fontWeight: "bold" },
  infoContainer: { flex: 1, padding: 12, gap: 8 },
  title: { color: "#fff", fontSize: 15, fontWeight: "bold", lineHeight: 18 },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  statItem: {
    flexDirection: "row",
    backgroundColor: "rgba(119, 155, 221, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray + "99",
  },
  statIcon: { fontSize: 12 },
  statValue: { color: COLORS.lightGray, fontSize: 12, fontWeight: "bold" },
  platformsContainer: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  platformChip: {
    backgroundColor: "rgba(81, 105, 150, 0.3)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#516996",
  },
  platformText: { color: "#9CB4DD", fontSize: 10, fontWeight: "600" },
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
  listContent: { paddingHorizontal: 10, paddingVertical: 5 },
});