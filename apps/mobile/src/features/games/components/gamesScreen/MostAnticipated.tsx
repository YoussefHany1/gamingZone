import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import SectionTitle from "@/src/components/SectionTitle";
import { SERVER_URL } from "@/src/constants/config";
import SkeletonMostAnticipated from "../../skeleton/gamesScreen/SkeletonMostAnticipated";
import { useCountdown } from "@/src/hooks/useCountdown";
import useCachedData from "@/src/hooks/useCachedData";
import type { AnticipatedCardProps } from "../../types";
import type { CountdownResult, Game } from "@/src/types/sharedTypes";
import ErrorState from "@/src/components/ErrorState";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;
const STORAGE_KEY = "MOST_ANTICIPATED_CACHE";

const fetchAnticipatedGames = async (): Promise<Game[]> => {
  const response = await axios.get<Game[]>(`${SERVER_URL}/most-anticipated`);
  return response.data;
};

// Sort ascending by release date; games without a date go to the end
const sortByReleaseDate = (games: Game[]): Game[] => {
  if (!Array.isArray(games) || games.length === 0) return [];
  return [...games].sort((a, b) => {
    const dateA = a.first_release_date ?? Infinity;
    const dateB = b.first_release_date ?? Infinity;
    return dateA - dateB;
  });
};

// Card

const AnticipatedCard = React.memo<AnticipatedCardProps>(({ item }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // Update countdown every minute â€” minute precision is sufficient here
  const timeLeft = useCountdown(
    item.first_release_date,
    60_000,
  ) as CountdownResult | null;

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Image
        source={
          item.cover
            ? {
                uri: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${item.cover.image_id}.webp`,
              }
            : require("@/assets/image-not-found.webp")
        }
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={item.cover?.image_id || item.id.toString()}
      />

      <View style={styles.overlay} />

      {/* Countdown row */}
      <View style={styles.content}>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.days")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.days : "â€”"}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.hours")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.hours : "â€”"}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.minutes")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.minutes : "â€”"}
          </Text>
        </View>
      </View>

      <View style={styles.textWrapper}>
        <Text style={styles.title} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
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
  } = useCachedData<Game[]>(STORAGE_KEY, fetchAnticipatedGames, []);

  const gamesToShow: Game[] = useMemo(
    () => sortByReleaseDate(games ?? []),
    [games],
  );

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
      <FlashList
        data={gamesToShow}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + 20}
        decelerationRate="fast"
        ListEmptyComponent={
          <View style={styles.errorContainer}>
            <ErrorState message={t("games.list.serverError")} />
          </View>
        }
        estimatedItemSize={CARD_WIDTH + 20}
      />
    </View>
  );
}

export default MostAnticipated;

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  listContent: { paddingHorizontal: 10 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    margin: 18,
  },
  errorContainer: {
    width: "100%",
    height: CARD_HEIGHT,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.secondary,
    elevation: 5,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    flexDirection: "row",
    gap: 15,
  },
  dateContainer: {
    flexDirection: "column",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 12,
  },
  countdownHeader: { color: "#fff", fontSize: 14 },
  countdownText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 32,
    backgroundColor: COLORS.primary + "30",
    paddingHorizontal: 12,
    borderRadius: 50,
  },
  textWrapper: { marginBottom: 10, marginHorizontal: 10 },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
