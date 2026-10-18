import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { igdbImageUrl } from "@gaming-zone/utils";
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Image } from "expo-image";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import { FlashList } from "@shopify/flash-list";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import SkeletonGameCard from "../../skeleton/gamesScreen/SkeletonGameCard";
import ErrorState from "@/src/components/ErrorState";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import useCachedData from "@/src/hooks/useCachedData";
import type { GameCardProps, GamesListProps, GameFilters } from "../../types";
import type { Game } from "@/src/types/sharedTypes";
import type { GamesStackParamList } from "../../screens/GameDetailsScreen";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import { searchGames } from "@/src/services/api/igdbApi";

const CARD_HEIGHT = 270;
const CARD_WIDTH = 160;
const NUM_COLUMNS = 2;
// The backend /search endpoint returns up to 50 games per page (page is 1-based).
const PAGE_SIZE = 50;
const VALID_GAME_TYPES = [1, 2, 5, 6, 7, 8, 9, 10];

// Helpers

// Pre-built StyleSheet objects for rating badge backgrounds, keyed by tier.
// The badge fills are fixed semantic colors, so each tier also carries its own
// foreground. Deriving the text color from the theme would render near-black
// text on the dark tiers in light mode.
const ratingStyles = StyleSheet.create({
  tier1: { backgroundColor: "#8B0000", color: "#ffffff" },
  tier2: { backgroundColor: "#FF4C4C", color: "#1a0000" },
  tier3: { backgroundColor: "#FFA500", color: "#1a0000" },
  tier4: { backgroundColor: "#71e047", color: "#0b2e00" },
  tier5: { backgroundColor: "#006400", color: "#ffffff" },
});

// Returns the pre-built style for a given score (0-10 scale)
function getRatingStyle(rating: number) {
  if (rating <= 2) return ratingStyles.tier1;
  if (rating <= 4) return ratingStyles.tier2;
  if (rating <= 6) return ratingStyles.tier3;
  if (rating <= 8) return ratingStyles.tier4;
  return ratingStyles.tier5;
}

async function fetchSearchResults(
  query: string | undefined,
  filters?: GameFilters,
  page = 1,
): Promise<Game[]> {
  return searchGames({ query, filters, page });
}

// Game Card

const GameCard = React.memo<GameCardProps>(({ item }) => {
  const styles = useThemeStyles((c) => ({
    gameCard: {
      borderWidth: 1,
      borderColor: c.accentText,
      borderRadius: 16,
      padding: 10,
      margin: 10,
      alignItems: "center",
      justifyContent: "center",
      height: CARD_HEIGHT,
      width: CARD_WIDTH,
    },
    cover: {
      width: 140,
      height: 190,
      borderRadius: 10,
      backgroundColor: c.accent,
    },
    gameType: {
      position: "absolute",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      color: c.text,
      fontWeight: "600",
      top: 0,
      left: 0,
      padding: 5,
      margin: 12,
      borderRadius: 12,
    },
    title: {
      color: c.text,
      fontSize: 15,
      fontWeight: "bold",
      marginTop: 10,
      textAlign: "center",
      width: "100%",
      height: 40,
    },
    rating: {
      position: "absolute",
      textAlign: "center",
      borderBottomLeftRadius: 16,
      borderTopRightRadius: 16,
      textAlignVertical: "center",
      width: 45,
      height: 45,
      top: 0,
      right: 0,
      fontSize: 18,
      fontWeight: "bold",
    },
  }));

  const navigation = useNavigation<NativeStackNavigationProp<GamesStackParamList>>();
  const { t } = useTranslation();

  const labelKey = `games.list.gameTypes.${item.game_type}`;
  const shouldShowLabel = VALID_GAME_TYPES.includes(item.game_type ?? -1);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <Image
        source={
          item.cover
            ? {
                uri: igdbImageUrl(item.cover.image_id, "cover_big"),
              }
            : require("@/assets/image-not-found.webp")
        }
        style={styles.cover}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={item.cover?.image_id || item.id.toString()}
      />
      {shouldShowLabel && <CustomText style={styles.gameType}>{t(labelKey)}</CustomText>}
      {item.total_rating != null && (
        <CustomText style={[styles.rating, getRatingStyle(item.total_rating / 10)]}>
          {Math.round(item.total_rating) / 10}
        </CustomText>
      )}
      <CustomText style={styles.title} numberOfLines={2}>
        {item.name}
      </CustomText>
    </TouchableOpacity>
  );
});
GameCard.displayName = "GameCard";

// Main List

function GamesList({ query, filters, onBack }: GamesListProps) {
  const { t } = useTranslation();
  const { onScroll } = useScrollDirection();
  const colors = useThemeColors();
  const bottomInset = useBottomInset();

  const styles = useThemeStyles(
    (c) => ({
      listContent: {
        paddingHorizontal: 4,
        paddingBottom: bottomInset,
      },
    cardWrapper: {
      width: "48%",
    },
    noResults: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    noResultsText: {
      color: c.textMuted,
      fontSize: 16,
      textAlign: "center",
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: c.accent,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginHorizontal: 12,
      marginTop: 8,
      marginBottom: 4,
      gap: 6,
    },
    backText: {
      color: c.onAccent,
      fontSize: 18,
      fontWeight: "bold",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 16,
    },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.accent,
      borderRadius: 20,
      paddingHorizontal: 24,
      paddingVertical: 10,
      gap: 8,
    },
    nextText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: "bold",
    },
    }),
    [bottomInset],
  );

  const safeQuery = (query ?? "all").replace(/\s/g, "_");
  const safeFilters = `${filters?.year ?? ""}_${filters?.genre ?? ""}_${filters?.platform ?? ""}_${filters?.sort ?? ""}`;
  const STORAGE_KEY = `GAMES_SEARCH_${safeQuery}_${safeFilters}`;

  // The parent rebuilds `filters` on every render, so depend on its fields: a
  // new-but-equal object would otherwise recreate the fetcher below and change
  // the cache-key dependencies on every render. Rebuilding the object from its
  // four fields is exact — `GameFilters` has no other members.
  const { year, genre, platform, sort } = filters ?? {};
  const hasFilters = filters !== undefined;
  const activeFilters = useMemo<GameFilters | undefined>(
    () =>
      hasFilters
        ? {
            year: year ?? null,
            genre: genre ?? null,
            platform: platform ?? null,
            sort: sort ?? null,
          }
        : undefined,
    [hasFilters, year, genre, platform, sort],
  );

  const fetchGames = useCallback(
    () => fetchSearchResults(query, activeFilters),
    [query, activeFilters],
  );

  const { data, isLoading, isRefetching, error, errorKind, refetch } =
    useCachedData<Game[]>(STORAGE_KEY, fetchGames, [query, activeFilters]);

  // Page 1 base list (served from cache + revalidated). Additional pages are
  // appended into extraGames so the cache stays a single-page snapshot.
  const baseGames = useMemo(() => data ?? [], [data]);
  const isInitialLoading = isLoading && baseGames.length === 0;

  const [page, setPage] = useState(1);
  const [extraGames, setExtraGames] = useState<Game[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const games = useMemo(() => [...baseGames, ...extraGames], [baseGames, extraGames]);

  // Reset accumulated pages whenever the base (page 1) list is replaced — e.g.
  // after a pull-to-refresh, a background TTL refetch, or a query/filters change.
  const baseRef = useRef(baseGames);
  useEffect(() => {
    if (baseGames !== baseRef.current) {
      baseRef.current = baseGames;
      setExtraGames([]);
      setPage(1);
      setHasMore(true);
    }
  }, [baseGames]);

  const extraRef = useRef(extraGames);
  useEffect(() => {
    extraRef.current = extraGames;
  }, [extraGames]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const next = await fetchSearchResults(query, activeFilters, nextPage);
      const seen = new Set([...baseGames, ...extraRef.current].map((g) => g.id));
      const uniqueNext = next.filter((g) => !seen.has(g.id));
      setExtraGames([...extraRef.current, ...uniqueNext]);
      setPage(nextPage);
      if (next.length < PAGE_SIZE) setHasMore(false);
    } catch {
      // Keep the button visible so a later tap can retry.
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, query, activeFilters, baseGames]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Game>) => (
      <View style={styles.cardWrapper}>
        <GameCard item={item} />
      </View>
    ),
    [styles],
  );

  const renderBackButton = useCallback(() => {
    if (!onBack) return null;
    return (
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
      >
        <ArrowLeft size={20} color={colors.onAccent} accessible={false} />
      </TouchableOpacity>
    );
  }, [onBack, styles, colors.onAccent, t]);

  const handleRefresh = useCallback(() => refetch(true), [refetch]);

  const refreshControl = (
    <RefreshControl
      refreshing={isRefetching && !isInitialLoading}
      onRefresh={handleRefresh}
      tintColor={colors.accent}
      colors={[colors.accent]}
    />
  );

  const renderSkeletonItem = useCallback(
    () => (
      <View style={styles.cardWrapper}>
        <SkeletonGameCard />
      </View>
    ),
    [styles],
  );

  const skeletonData = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ id: i }) as unknown as Game),
    [],
  );

  // Only show "Next" when there might be more: an already-loaded page 2, or a
  // full page 1 (a short first page means the result set is exhausted).
  const canLoadMore = hasMore && (page > 1 || baseGames.length >= PAGE_SIZE);

  const renderFooter = useCallback(() => {
    if (!canLoadMore) return null;
    return (
      <View style={styles.footer}>
        {isLoadingMore ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleLoadMore}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("games.list.next")}
          >
            <CustomText style={styles.nextText}>{t("games.list.next")}</CustomText>
            <ArrowRight size={20} color={colors.onAccent} accessible={false} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    canLoadMore,
    isLoadingMore,
    handleLoadMore,
    colors.accent,
    colors.onAccent,
    t,
    styles,
  ]);

  if (isInitialLoading) {
    return (
      <FlashList
        data={skeletonData}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSkeletonItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderBackButton}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    );
  }

  if (error || !Array.isArray(games)) {
    // No cached payload + no connectivity reads as "offline", not a server
    // failure. A retry while still offline would fail identically, so that
    // state gets a network-specific message without the contact button.
    const isOfflineStale =
      !error && errorKind === "offline" && games.length === 0;
    return (
      <ErrorState
        message={
          isOfflineStale ? t("common.noInternet") : t("games.list.serverError")
        }
        showContactButton={!isOfflineStale}
      />
    );
  }

  if (games.length === 0) {
    return (
      <View>
        {renderBackButton()}
        <CustomText style={styles.noResults}>{t("games.list.noResults")}</CustomText>
      </View>
    );
  }

  return (
    <FlashList
      data={games}
      numColumns={NUM_COLUMNS}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderBackButton}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  );
}

export default React.memo(GamesList);
