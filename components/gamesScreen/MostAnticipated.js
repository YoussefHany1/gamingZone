import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import SkeletonMostAnticipated from "../../skeleton/SkeletonMostAnticipated";
import { useCountdown } from "../../hooks/useCountdown";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85; // The card takes 85% of the screen width
const CARD_HEIGHT = 220;

const fetchAnticipatedGames = async () => {
  const response = await axios.get(`${SERVER_URL}/most-anticipated`);
  return response.data;
};

const sortByReleaseDate = (games) => {
  if (!Array.isArray(games) || games.length === 0) return [];

  return [...games].sort((a, b) => {
    const dateA = a.first_release_date ?? Infinity;
    const dateB = b.first_release_date ?? Infinity;
    return dateA - dateB;
  });
};

const AnticipatedCard = React.memo(({ item }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const timeLeft = useCountdown(item.first_release_date, 60000); // Update every minute

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
            ? `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${item.cover.image_id}.jpg`
            : require("../../assets/image-not-found.webp")
        }
        style={styles.backgroundImage}
        contentFit="cover"
        transition={500}
      />

      <View style={styles.overlay} />

      {/* countdown */}
      <View style={styles.content}>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.days")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.days : "Date TBA"}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.hours")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.hours : "Date TBA"}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.countdownHeader}>
            {t("games.list.mostAnticipated.countdown.minutes")}
          </Text>
          <Text style={styles.countdownText}>
            {timeLeft ? timeLeft.minutes : "Date TBA"}
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

export default function MostAnticipated() {
  const { t } = useTranslation();
  const [cachedGames, setCachedGames] = useState([]);
  const STORAGE_KEY = `MOST_ANTICIPATED_CACHE`;

  // load cache
  useEffect(() => {
    const loadCache = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) setCachedGames(JSON.parse(jsonValue));
      } catch (e) {
        console.error(e);
      }
    };
    loadCache();
  }, []);

  // fetch data
  const {
    data: freshGames,
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: ["games", "most-anticipated"],
    queryFn: fetchAnticipatedGames,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 2,
  });

  if (isError) {
    console.error("Failed to fetch games:", error);
  }

  // update cache when new data is fetched
  useEffect(() => {
    if (isSuccess && freshGames && freshGames.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshGames));
    }
  }, [isSuccess, freshGames]);

  const gamesToShow = useMemo(
    () => sortByReleaseDate(freshGames?.length > 0 ? freshGames : cachedGames),
    [freshGames, cachedGames],
  );

  if (gamesToShow.length === 0) return <SkeletonMostAnticipated />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {t("games.list.mostAnticipated.header")}
      </Text>
      <FlatList
        data={gamesToShow}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <AnticipatedCard item={item} />}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + 20}
        decelerationRate="fast"
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + 20,
          offset: (CARD_WIDTH + 20) * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    fontSize: 28,
    color: "white",
    marginLeft: 20,
    marginBottom: 15,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 10,
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
    display: "flex",
    flexDirection: "row",
    gap: 15,
  },
  dateContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 12,
  },
  countdownHeader: {
    color: "#fff",
    fontSize: 14,
  },
  countdownText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 32,
    backgroundColor: COLORS.primary + "30",
    paddingHorizontal: 12,
    borderRadius: 50,
  },
  textWrapper: {
    marginBottom: 10,
    marginHorizontal: 10,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
