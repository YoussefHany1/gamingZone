import React, { useCallback, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import CustomText from "@/src/components/CustomText";
import { Image } from "expo-image";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import SectionTitle from "@/src/components/SectionTitle";
import SkeletonMostAnticipated from "../../skeleton/gamesScreen/SkeletonMostAnticipated";
import useCachedData from "@/src/hooks/useCachedData";
import type { AnticipatedCardProps } from "../../types";
import type { Game } from "@/src/types/sharedTypes";
import ErrorState from "@/src/components/ErrorState";
import { fetchMostAnticipatedGames } from "@/src/services/api/igdbApi";

const CARD_WIDTH = 160;
const STORAGE_KEY = "MOST_ANTICIPATED_CACHE";

// Sort ascending by release date; games without a date go to the end
const sortByReleaseDate = (games: Game[]): Game[] => {
  if (!Array.isArray(games) || games.length === 0) return [];
  return [...games].sort((a, b) => {
    const dateA = a.first_release_date ?? Infinity;
    const dateB = b.first_release_date ?? Infinity;
    return dateA - dateB;
  });
};

const formatDate = (timestamp: number | undefined, lang: string) => {
  if (!timestamp) return "TBD";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(lang, { day: "numeric", month: "short" });
};

// Card

const AnticipatedCard = React.memo<AnticipatedCardProps>(({ item }) => {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();

  const formattedDate = formatDate(item.first_release_date, i18n.language);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Timeline Section */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineLine} />
        <CustomText style={styles.timelineDate}>{formattedDate}</CustomText>
        <View style={styles.timelineDot} />
      </View>

      {/* Cover Image */}
      <Image
        source={
          item.cover
            ? {
                uri: `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`,
              }
            : require("@/assets/image-not-found.webp")
        }
        style={styles.coverImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={item.cover?.image_id || item.id.toString()}
      />

      {/* Title */}
      <CustomText style={styles.title} numberOfLines={2}>
        {item.name}
      </CustomText>
    </TouchableOpacity>
  );
});
AnticipatedCard.displayName = "AnticipatedCard";

// Main

function MostAnticipated(): React.ReactElement {
  const { t } = useTranslation();

  const {
    data: games,
    isLoading,
    error: isError,
  } = useCachedData<Game[]>(STORAGE_KEY, fetchMostAnticipatedGames, []);

  const gamesToShow: Game[] = useMemo(() => sortByReleaseDate(games ?? []), [games]);

  const isInitialLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => <AnticipatedCard item={item} />,
    [],
  );

  if (isInitialLoading) return <SkeletonMostAnticipated />;

  if (isError && gamesToShow.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <ErrorState message={t("games.list.serverError")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle
          title={t("games.list.mostAnticipated.title")}
          subtitle={t("games.list.mostAnticipated.subtitle")}
          fontSize={24}
        />
      </View>
      <FlashList renderScrollComponent={GHScrollView as any}
        data={gamesToShow}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        ListEmptyComponent={
          <View style={styles.errorContainer}>
            <ErrorState message={t("games.list.serverError")} />
          </View>
        }
        estimatedItemSize={CARD_WIDTH}
      />
    </View>
  );
}

export default MostAnticipated;

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  listContent: { paddingHorizontal: 10, paddingVertical: 10 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginBottom: 20,
  },
  errorContainer: {
    width: "100%",
    height: 300,
  },
  cardContainer: {
    width: CARD_WIDTH,
    alignItems: "center",
  },
  timelineContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 15,
    height: 45,
  },
  timelineLine: {
    position: "absolute",
    bottom: 5, // Aligns perfectly with the center of a 12px dot
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#7f8c8d",
    zIndex: -1,
  },
  timelineDate: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  coverImage: {
    width: 140,
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: COLORS.secondary,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 8,
    textTransform: "uppercase",
  },
});
