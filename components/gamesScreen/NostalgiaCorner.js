import React, { useCallback, useState, useEffect } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import SkeletonGameCard from "../../skeleton/SkeletonGameCard";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;
const CARD_HEIGHT = 360;
const CARD_MARGIN = 10;

// دالة جلب الألعاب الكلاسيكية
const fetchNostalgiaGames = async () => {
  const response = await axios.get(`${SERVER_URL}/nostalgia-corner`);
  return response.data;
};

// دالة الحصول على السنة
const getYear = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).getFullYear();
};

// دالة الحصول على العقد (Decade)
const getDecade = (year) => {
  if (!year) return "";
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
};

// دالة الحصول على الكونسول/البلاتفورم الأساسية
const getRetroConsole = (platforms) => {
  if (!platforms || platforms.length === 0) return null;

  // ترتيب الكونسولات الكلاسيكية حسب الشهرة
  const retroPriority = [
    "PS1",
    "PS2",
    "PS3",
    "Xbox",
    "X360",
    "Atari",
    "NES",
    "SNES",
    "N64",
    "GameCube",
    "Wii",
    "GB",
    "GBC",
    "GBA",
    "NDS",
    "3DS",
    "PSP",
    "PS Vita",
    "Genesis",
    "Dreamcast",
    "Saturn",
    "Commodore",
  ];

  for (const priority of retroPriority) {
    const found = platforms.find(
      (p) => p.abbreviation?.includes(priority) || p.name?.includes(priority),
    );
    if (found) return found.abbreviation || found.name;
  }

  return platforms[0]?.abbreviation || platforms[0]?.name;
};

const NostalgiaCard = React.memo(({ item }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const year = getYear(item.first_release_date);
  const decade = getDecade(year);
  const retroConsole = getRetroConsole(item.platforms);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* خلفية بتأثير غامق vintage */}
      <LinearGradient
        colors={["#0c1a33", "#172a4a", "#1a3052"]}
        style={styles.paperBackground}
      />

      {/* إطار خارجي كلاسيكي */}
      <View style={styles.outerFrame}>
        {/* العقد (Decade) في الزاوية */}
        <View style={styles.decadeBadge}>
          <Text style={styles.decadeText}>{decade}</Text>
        </View>

        {/* صورة الغلاف مع إطار */}
        <View style={styles.coverFrame}>
          <View style={styles.coverInnerFrame}>
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

            {/* تأثير سيبيا خفيف */}
            <View style={styles.sepiaOverlay} />
          </View>

          {/* ظل الإطار */}
          <View style={styles.frameShadow} />
        </View>

        {/* شريط السنة الكلاسيكي */}
        <View style={styles.titleRibbon}>
          <View style={styles.ribbonLeft} />
          <View style={styles.ribbonCenter}>
            <Text style={styles.titleText}>{item.name}</Text>
          </View>
          <View style={styles.ribbonRight} />
        </View>

        {/* معلومات اللعبة */}
        <View style={styles.infoContainer}>
          {/* الكونسول الكلاسيكي */}
          {retroConsole && (
            <View style={styles.consoleContainer}>
              <View style={styles.consoleBadge}>
                <Text style={styles.consoleIcon}>🎮</Text>
                <Text style={styles.consoleText}>{retroConsole}</Text>
              </View>
            </View>
          )}
        </View>

        {/* زخرفة الزوايا */}
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
      </View>
    </TouchableOpacity>
  );
});

export default function NostalgiaCorner() {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_NOSTALGIA_CORNER";

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
    queryKey: ["games", "nostalgia-corner"],
    queryFn: fetchNostalgiaGames,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
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
    ({ item }) => <NostalgiaCard item={item} />,
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
        <Text style={styles.header}>{t("games.list.nostalgiaCorner")}</Text>
      </View>

      {/* Skeleton Loading */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 4 }).map((_, i) => ({ id: i }))}
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
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
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
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    position: "relative",
  },
  paperBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  outerFrame: {
    flex: 1,
    margin: 8,
    padding: 12,
    borderWidth: 3,
    borderColor: "#779bdd",
    borderRadius: 8,
    backgroundColor: "#0c1a33",
    position: "relative",
  },
  decadeBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    backgroundColor: "#516996",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#779bdd",
    zIndex: 5,
    elevation: 4,
    shadowColor: "#779bdd",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  decadeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  coverFrame: {
    alignSelf: "center",
    marginTop: 10,
  },
  coverInnerFrame: {
    padding: 4,
    backgroundColor: COLORS.darkBackground,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#516996",
    elevation: 6,
    shadowColor: "#779bdd",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  cover: {
    width: 120,
    height: 160,
    borderRadius: 4,
  },
  sepiaOverlay: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    backgroundColor: "rgba(81, 105, 150, 0.15)",
    borderRadius: 4,
  },
  frameShadow: {
    position: "absolute",
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    backgroundColor: "rgba(0, 0, 28, 0.6)",
    borderRadius: 8,
    zIndex: -1,
  },
  titleRibbon: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  ribbonLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderTopColor: "transparent",
    borderBottomWidth: 12,
    borderBottomColor: "transparent",
    borderRightWidth: 10,
    borderRightColor: "#516996",
  },
  ribbonCenter: {
    flex: 1,
    backgroundColor: "#516996",
    paddingVertical: 4,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#779bdd",
  },
  ribbonRight: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderTopColor: "transparent",
    borderBottomWidth: 12,
    borderBottomColor: "transparent",
    borderLeftWidth: 10,
    borderLeftColor: "#516996",
  },
  titleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 3,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoContainer: {
    flex: 1,
    gap: 6,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: "serif",
  },
  consoleContainer: {
    alignItems: "center",
    marginTop: 6,
  },
  consoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderWidth: 1,
    borderColor: "#779bdd",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  consoleIcon: {
    fontSize: 12,
  },
  consoleText: {
    color: "#779bdd",
    fontSize: 12,
    fontWeight: "bold",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 15,
    height: 15,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#516996",
  },
  cornerTopRight: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 15,
    height: 15,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#516996",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 5,
    left: 5,
    width: 15,
    height: 15,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#516996",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 15,
    height: 15,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#516996",
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
    fontStyle: "italic",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
