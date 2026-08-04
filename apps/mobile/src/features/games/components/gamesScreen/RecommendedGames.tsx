import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonPopular from "../../skeleton/gamesScreen/SkeletonPopular";
import ErrorState from "@/src/components/ErrorState";
import COLORS from "@/src/constants/colors";
import type { Game } from "@/src/types/sharedTypes";
import SectionTitle from "@/src/components/SectionTitle";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";
import { useRecommendedGames } from "../../hooks/useRecommendedGames";

const CARD_WIDTH = 165;
const CARD_HEIGHT = 300;
const CARD_MARGIN = 5;
const SKELETON_DATA = Array.from({ length: 5 }, (_, i) => ({ id: i }) as any);

type RecommendedCardProps = {
  item: Game;
};

// Card
const RecommendedCard = React.memo<RecommendedCardProps>(({ item }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<GamesStackParamList>>();

  const rating = item.total_rating ? Math.round(item.total_rating) / 10 : 0;

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
          source={
            item.cover
              ? {
                  uri: `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`,
                }
              : require("@/assets/image-not-found.webp")
          }
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={["transparent", COLORS.darkBackground]}
          style={styles.coverGradient}
        />
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
RecommendedCard.displayName = "RecommendedCard";

// Main

function RecommendedGames(): React.ReactElement | null {
  const { t } = useTranslation();
  const { recommendedGames, loading, basedOnGenre } = useRecommendedGames();

  // If not loading and no recommendations are available, hide the section entirely
  if (!loading && (!recommendedGames || recommendedGames.length === 0)) {
    return null;
  }

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => (
      <RecommendedCard item={item} />
    ),
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonPopular />, []);

  // Title depends on the extracted genre
  const title = t("games.list.recommended.title", "Recommended for You");
  const subtitle = basedOnGenre 
    ? t("games.list.recommended.subtitle", { genre: basedOnGenre, defaultValue: `Because you like ${basedOnGenre} games` })
    : "";

  return (
    <View>
      <View style={styles.headerContainer}>
        <SectionTitle
          title={title}
          fontSize={24}
          subtitle={subtitle}
        />
      </View>

      {loading && (
        <FlashList
          data={SKELETON_DATA}
          horizontal
          renderItem={renderSkeletonItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={175}
        />
      )}

      {!loading && recommendedGames && recommendedGames.length > 0 && (
        <FlashList
          data={recommendedGames}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          estimatedItemSize={175}
        />
      )}
    </View>
  );
}

export default RecommendedGames;

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
    marginHorizontal: CARD_MARGIN,
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
  listContent: { paddingHorizontal: 10, paddingVertical: 5 },
});
