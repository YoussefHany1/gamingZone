import React, { useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonGamingevents from "../../skeleton/SkeletonGamingevents";
import COLORS from "../../constants/colors";
import SectionTitle from "../SectionTitle";
import { SERVER_URL } from "../../constants/config";
import { useCountdown } from "../../hooks/useCountdown";
import type { TimeLeft } from "../../hooks/useCountdown";
import ErrorState from "../ErrorState";
import useCachedData from "../../hooks/useCachedData";
import { openLink } from "../../lib/browser";
import { GamingEvent } from "../types";
import type { HomeStackParamList } from "../../navigation/AppNavigator";
import axios from "axios";

// ─── Layout constants ──────────────────────────────────────────────────────────

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;
const CARD_MARGIN = 10;
const CARD_ITEM_SIZE = CARD_WIDTH + CARD_MARGIN * 2;

const STORAGE_KEY = "GAMES_CACHE_EVENTS";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fetchEvents = async (): Promise<GamingEvent[]> => {
  const response = await axios.get<GamingEvent[]>(`${SERVER_URL}/events`);
  return response.data;
};

const formatEventDate = (timestamp: number, language = "en"): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString(language, options);
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type EventStatus = "upcoming" | "live" | "ended";

// ─── Pure functions ────────────────────────────────────────────────────────────

const getEventStatus = (startTime: number, endTime: number): EventStatus => {
  const now = Date.now() / 1000;
  if (now < startTime) return "upcoming";
  if (now <= endTime) return "live";
  return "ended";
};

/** Builds a compact countdown string, e.g. "2d 4h 30m" or "45m". */
const formatCountdown = (
  timeUntil: TimeLeft,
  t: (key: string) => string,
): string => {
  const parts: string[] = [];
  if (timeUntil.days > 0) parts.push(`${timeUntil.days}${t("common.time.d")}`);
  if (timeUntil.hours > 0 || timeUntil.days > 0)
    parts.push(`${timeUntil.hours}${t("common.time.h")}`);
  if (timeUntil.minutes > 0 || timeUntil.hours > 0 || timeUntil.days > 0)
    parts.push(`${timeUntil.minutes}${t("common.time.m")}`);
  return parts.join(" ");
};

// ─── EventCard ─────────────────────────────────────────────────────────────────

interface EventCardProps {
  item: GamingEvent;
}

const EventCard = memo<EventCardProps>(({ item }) => {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const status: EventStatus = getEventStatus(item.start_time, item.end_time);
  const timeUntil = useCountdown(status === "upcoming" ? item.start_time : null);

  // Stable handler — deps are primitives only (item ref avoids stale closure)
  const itemRef = useRef(item);
  itemRef.current = item;
  const handlePress = useCallback((): void => {
    navigation.navigate("EventDetailsScreen", { event: itemRef.current });
  }, [navigation]);

  const handleStreamPress = useCallback((): void => {
    if (item.live_stream_url) {
      openLink(item.live_stream_url).catch(() =>
        console.error("[GamingEvents] Failed to open stream URL"),
      );
    }
  }, [item.live_stream_url]);

  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={handlePress}
      activeOpacity={0.92}
    >
      <Image
        recyclingKey={item.event_logo?.image_id ?? ""}
        source={
          item.event_logo
            ? `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${item.event_logo.image_id}.webp`
            : require("../../assets/image-not-found.webp")
        }
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        allowDownscaling
      />

      <LinearGradient
        colors={["rgba(12, 26, 51, 0.4)", "rgba(12, 26, 51, 0.95)"]}
        style={styles.gradientOverlay}
      />

      <View style={styles.contentContainer}>
        {/* Status badge */}
        <View style={styles.topRow}>
          {status === "live" && (
            <LinearGradient
              colors={["#FF3B30", "#FF6B6B"]}
              style={styles.liveBadge}
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t("home.gamingEvents.live")}</Text>
            </LinearGradient>
          )}
          {status === "upcoming" && (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingText}>
                {t("home.gamingEvents.upcoming")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Countdown timer — only shown for upcoming events with time remaining */}
          {timeUntil && (
            <View style={styles.dateTimeRow}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>
                  {formatEventDate(item.start_time, i18n.language)}
                </Text>
              </View>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>
                  {formatCountdown(timeUntil, t)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {status === "live" && <View style={styles.liveGlow} />}
    </TouchableOpacity>
  );
});

EventCard.displayName = "EventCard";

// ─── Skeleton placeholder items ────────────────────────────────────────────────

type SkeletonItem = { id: number };
const SKELETON_DATA: SkeletonItem[] = Array.from({ length: 3 }, (_, i) => ({
  id: i,
}));

// ─── GamingEvents ──────────────────────────────────────────────────────────────

function GamingEvents(): React.ReactElement {
  const { t } = useTranslation();

  const {
    data: events,
    isLoading,
    error,
  } = useCachedData<GamingEvent[]>(STORAGE_KEY, fetchEvents, []);

  const eventsToShow: GamingEvent[] = events ?? [];
  const isActuallyLoading = isLoading && eventsToShow.length === 0;

  // ── All hooks must be called before any early return (Rules of Hooks) ──
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GamingEvent>) => <EventCard item={item} />,
    [],
  );

  const renderSkeletonItem = useCallback(
    () => <SkeletonGamingevents />,
    [],
  );

  const keyExtractorEvents = useCallback(
    (item: GamingEvent) => String(item.id),
    [],
  );

  const keyExtractorSkeleton = useCallback(
    (item: SkeletonItem) => String(item.id),
    [],
  );

  // Hide the entire section when data loaded successfully but array is empty
  if (!isLoading && !error && eventsToShow.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle
          title={t("home.gamingEvents.header")}
          subtitle={t("home.gamingEvents.subtitle")}
          fontSize={28}
        />
      </View>

      {isActuallyLoading && (
        <FlashList
          data={SKELETON_DATA}
          horizontal
          keyExtractor={keyExtractorSkeleton}
          renderItem={renderSkeletonItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={CARD_ITEM_SIZE}
        />
      )}

      {error && (
        <View style={styles.errorWrapper}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {!error && (
        <FlashList
          data={eventsToShow}
          horizontal
          keyExtractor={keyExtractorEvents}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_ITEM_SIZE}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isActuallyLoading ? (
              <View style={styles.errorWrapper}>
                <ErrorState message={t("home.gamingEvents.noEvents")} />
              </View>
            ) : null
          }
          estimatedItemSize={CARD_ITEM_SIZE}
        />
      )}
    </View>
  );
}

export default memo(GamingEvents);

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    margin: 18,
  },
  listContent: { padding: 10 },
  errorWrapper: { width: "100%", height: CARD_HEIGHT },
  eventCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  contentContainer: { flex: 1, padding: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    elevation: 4,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textLight,
  },
  liveText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  upcomingBadge: {
    backgroundColor: COLORS.primary + "80",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  upcomingText: { color: COLORS.textLight, fontSize: 11, fontWeight: "bold" },
  infoContainer: {
    gap: 8,
    justifyContent: "flex-end",
    flexGrow: 1,
    marginLeft: 4,
  },
  eventTitle: {
    color: COLORS.textLight,
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.secondary + "80",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  dateText: { color: COLORS.textLight, fontSize: 12, fontWeight: "600" },
  countdownContainer: {
    backgroundColor: COLORS.secondary + "80",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  countdownText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "bold",
  },
  liveGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FF3B30",
    elevation: 10,
  },
});
