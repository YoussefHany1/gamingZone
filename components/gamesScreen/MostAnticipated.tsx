import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/colors";
import SectionTitle from "../SectionTitle";
import { SERVER_URL } from "../../constants/config";
import SkeletonMostAnticipated from "../../skeleton/SkeletonMostAnticipated";
import { useCountdown } from "../../hooks/useCountdown";
import { Game, CountdownResult } from "../types";
import ErrorState from "../ErrorState";

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

interface AnticipatedCardProps {
  item: Game;
}

const AnticipatedCard = React.memo<AnticipatedCardProps>(({ item }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // Update countdown every minute — precision beyond minutes isn't needed here
  const timeLeft = useCountdown(item.first_release_date, 60000) as CountdownResult | null;

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
        recyclingKey={item.cover?.image_id ?? ""}
        source={
          item.cover
            ? `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${item.cover.image_id}.webp`
            : require("../../assets/image-not-found.webp")
        }
        style={styles.backgroundImage}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
        allowDownscaling={true}
      />

      <View style={styles.overlay} />

      {/* Countdown row */}
      <View style={styles.content}>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.days")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.days : "—"}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.hours")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.hours : "—"}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.minutes")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.minutes : "—"}
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

// main

function MostAnticipated(): React.ReactElement {
  const { t } = useTranslation();
  const [cachedGames, setCachedGames] = useState<Game[]>([]);

  // Load persisted cache on mount
  useEffect(() => {
    const loadCache = async (): Promise<void> => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) setCachedGames(JSON.parse(jsonValue));
      } catch (e) {
        console.error(e);
      }
    };
    loadCache();
  }, []);

  const {
    data: freshGames,
    isSuccess,
    isError,
    error,
  } = useQuery<Game[]>({
    queryKey: ["games", "most-anticipated"],
    queryFn: fetchAnticipatedGames,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
  });

  if (isError) console.error("Failed to fetch games:", error);

  // Persist fresh data to AsyncStorage whenever it arrives
  useEffect(() => {
    if (isSuccess && freshGames && freshGames.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshGames));
    }
  }, [isSuccess, freshGames]);

  const gamesToShow: Game[] = useMemo(
    () => sortByReleaseDate(freshGames?.length ? freshGames : cachedGames),
    [freshGames, cachedGames],
  );

  if (!isError && gamesToShow.length === 0 && !isSuccess) return <SkeletonMostAnticipated />;

  if (!Array.isArray(gamesToShow) && isError) return
  <View style={{ width: "100%", height: CARD_HEIGHT }}>
    <ErrorState message={t("games.list.serverError")} />
  </View>;

  const renderItem = ({ item }: ListRenderItemInfo<Game>) => (
    <AnticipatedCard item={item} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle title={t("games.list.mostAnticipated.title")} subtitle={t("games.list.mostAnticipated.subtitle")} fontSize={28} />
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
        ListEmptyComponent={<View style={{ width: "100%", height: CARD_HEIGHT }}>
          <ErrorState message={t("games.list.serverError")} />
        </View>}
        estimatedItemSize={CARD_WIDTH + 20}
      />
    </View>
  );
}
export default MostAnticipated

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