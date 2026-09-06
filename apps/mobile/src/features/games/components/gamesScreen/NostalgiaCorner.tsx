import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import React, { useCallback } from "react";
import CustomText from "@/src/components/CustomText";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import ErrorState from "@/src/components/ErrorState";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonNostalgiaCorner from "../../skeleton/gamesScreen/SkeletonNostalgiaCorner";
import COLORS from "@/src/constants/colors";
import SectionTitle from "@/src/components/SectionTitle";
import useCachedData from "@/src/hooks/useCachedData";
import type { GamePlatform, NostalgiaCardProps } from "../../types";
import type { Game } from "@/src/types/sharedTypes";
import { fetchNostalgiaGames } from "@/src/services/api/igdbApi";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;
const CARD_HEIGHT = 360;
const CARD_MARGIN = 10;
const STORAGE_KEY = "GAMES_CACHE_NOSTALGIA_CORNER";
const SKELETON_DATA = Array.from({ length: 4 }, (_, i) => ({ id: i }) as any);

// Helpers

const getYear = (timestamp: number | null | undefined): number | "" => {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).getFullYear();
};

const getDecade = (year: number | ""): string => {
  if (!year) return "";
  return `${Math.floor(year / 10) * 10}s`;
};

// Priority-ordered list of retro console identifiers
const RETRO_PRIORITY: string[] = [
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

// Returns the most iconic retro platform name for a given list of platforms
const getRetroConsole = (platforms: GamePlatform[] | null | undefined): string | null => {
  if (!platforms || platforms.length === 0) return null;

  for (const priority of RETRO_PRIORITY) {
    const found = platforms.find(
      (p) => p.abbreviation?.includes(priority) || p.name?.includes(priority),
    );
    if (found) return found.abbreviation ?? found.name ?? null;
  }

  return platforms[0]?.abbreviation ?? platforms[0]?.name ?? null;
};

// Card

const NostalgiaCard = React.memo<NostalgiaCardProps>(({ item }) => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

  const year = getYear(item.first_release_date);
  const decade = getDecade(year);
  const retroConsole = getRetroConsole(item.platforms);

  const handlePress = useCallback((): void => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress} activeOpacity={0.85}>
      {/* Vintage dark background */}
      <LinearGradient
        colors={["#0c1a33", "#172a4a", "#1a3052"]}
        style={styles.paperBackground}
      />

      <View style={styles.outerFrame}>
        {/* Decade badge positioned at the top edge */}
        <View style={styles.decadeBadge}>
          <CustomText style={styles.decadeText}>{decade}</CustomText>
        </View>

        {/* Cover image with sepia overlay */}
        <View style={styles.coverFrame}>
          <View style={styles.coverInnerFrame}>
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
              recyclingKey={item.cover?.image_id || item.id.toString()}
            />
            {/* Subtle sepia tint for a retro feel */}
            <View style={styles.sepiaOverlay} />
          </View>
          <View style={styles.frameShadow} />
        </View>

        {/* Ribbon-style title bar */}
        <View style={styles.titleRibbon}>
          <View style={styles.ribbonLeft} />
          <View style={styles.ribbonCenter}>
            <CustomText style={styles.titleText}>{item.name}</CustomText>
          </View>
          <View style={styles.ribbonRight} />
        </View>

        {/* Console info */}
        <View style={styles.infoContainer}>
          {retroConsole && (
            <View style={styles.consoleBadge}>
              <CustomText style={styles.consoleText}>{retroConsole}</CustomText>
            </View>
          )}
        </View>

        {/* Classic corner decorations */}
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
      </View>
    </TouchableOpacity>
  );
});
NostalgiaCard.displayName = "NostalgiaCard";

// Main

export default function NostalgiaCorner(): React.ReactElement {
  const { t } = useTranslation();

  const {
    data: games,
    isLoading,
    error,
  } = useCachedData<Game[]>(STORAGE_KEY, fetchNostalgiaGames, []);

  const gamesToShow: Game[] = games ?? [];
  const isActuallyLoading = isLoading && gamesToShow.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => <NostalgiaCard item={item} />,
    [],
  );

  const renderSkeletonItem = useCallback(() => <SkeletonNostalgiaCorner />, []);

  return (
    <View>
      <View style={styles.headerContainer}>
        <SectionTitle
          title={t("games.list.nostalgiaCorner.title")}
          subtitle={t("games.list.nostalgiaCorner.subtitle")}
          fontSize={24}
        />
      </View>

      {/* Skeleton while loading with no cached data */}
      {isActuallyLoading && (
        <FlashList
          renderScrollComponent={GHScrollView as any}
          data={SKELETON_DATA}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSkeletonItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {(error || !Array.isArray(gamesToShow)) && (
        <View style={styles.errorContainer}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {!error && Array.isArray(gamesToShow) && !isActuallyLoading && (
        <FlashList
          renderScrollComponent={GHScrollView as any}
          data={gamesToShow}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.errorContainer}>
              <ErrorState message={t("games.list.serverError")} />
            </View>
          }
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
  errorContainer: {
    width: "100%",
    height: CARD_HEIGHT,
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
  coverFrame: { alignSelf: "center", marginTop: 10 },
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
  cover: { width: 120, height: 160, borderRadius: 4 },
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
  infoContainer: { flex: 1 },
  consoleBadge: {
    // flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: COLORS.secondary + "20",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  consoleIcon: { fontSize: 12 },
  consoleText: { color: COLORS.lightGray, fontSize: 12, fontWeight: "bold" },
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
  listContent: { paddingHorizontal: 10, paddingVertical: 5 },
});
