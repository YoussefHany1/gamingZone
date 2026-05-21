import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  ListRenderItemInfo,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonGamingevents from "../../skeleton/SkeletonGamingevents";
import COLORS from "../../constants/colors";
import SectionTitle from "../SectionTitle";
import { SERVER_URL } from "../../constants/config";
import { useCountdown } from "../../hooks/useCountdown";
import ErrorState from "../ErrorState";
import useCachedData from "../../hooks/useCachedData";
import { GamingEvent, CountdownResult } from "../types";
import type { HomeStackParamList } from "../../navigation/AppNavigator";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;
const CARD_MARGIN = 10;

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

type EventStatus = "upcoming" | "live" | "ended";

const getEventStatus = (start_time: number, end_time: number): EventStatus => {
  const now = Date.now() / 1000;
  if (now < start_time) return "upcoming";
  if (now >= start_time && now <= end_time) return "live";
  return "ended";
};

// Card

interface EventCardProps {
  item: GamingEvent;
  onPress: () => void;
}

const EventCard = React.memo<EventCardProps>(({ item, onPress }) => {
  const { t, i18n } = useTranslation();
  // console.log(item)
  const status: EventStatus = getEventStatus(item.start_time, item.end_time);
  const timeUntil = useCountdown(
    status === "upcoming" ? item.start_time : null,
  ) as CountdownResult | null;

  const handleStreamPress = useCallback((): void => {
    if (item.live_stream_url) {
      Linking.openURL(item.live_stream_url).catch(() =>
        console.error("Failed to open URL"),
      );
    }
  }, [item.live_stream_url]);

  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={onPress}
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
        allowDownscaling={true}
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

          {/* Countdown timer for upcoming events */}
          {timeUntil && (
            <View style={styles.dateTimeRow}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>
                  {formatEventDate(item.start_time, i18n.language)}
                </Text>
              </View>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>
                  {timeUntil.days > 0 ? `${timeUntil.days}${t("common.time.d")} ` : ""}
                  {timeUntil.hours > 0 || timeUntil.days > 0
                    ? `${timeUntil.hours}${t("common.time.h")} `
                    : ""}
                  {timeUntil.minutes > 0 ||
                    timeUntil.hours > 0 ||
                    timeUntil.days > 0
                    ? `${timeUntil.minutes}${t("common.time.m")}`
                    : ""}
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

// main

function GamingEvents(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const STORAGE_KEY = "GAMES_CACHE_EVENTS";

  const { data: events, isLoading, error } = useCachedData<GamingEvent[]>(
    STORAGE_KEY,
    fetchEvents,
    [],
  );

  const eventsToShow: GamingEvent[] = events ?? [];
  const isActuallyLoading = isLoading && eventsToShow.length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GamingEvent>) => {
      const handlePress = () =>
        navigation.navigate("EventDetailsScreen", { event: item });
      return <EventCard item={item} onPress={handlePress} />;
    },
    [navigation],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<GamingEvent> | null | undefined, index: number) => ({
      length: CARD_WIDTH + CARD_MARGIN * 2,
      offset: (CARD_WIDTH + CARD_MARGIN * 2) * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle title={t("home.gamingEvents.header")} subtitle={t("home.gamingEvents.subtitle")} fontSize={28} />
      </View>

      {isActuallyLoading && (
        <FlashList
          data={Array.from({ length: 3 }, (_, i) => ({ id: i } as any))}
          horizontal
          renderItem={() => <SkeletonGamingevents />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={CARD_WIDTH + CARD_MARGIN * 2}
        />
      )}

      {/* error */}
      {(error || !Array.isArray(eventsToShow)) && (
        <View style={{ width: "100%", height: CARD_HEIGHT }}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {!error && Array.isArray(eventsToShow) && (
        <FlashList
          data={eventsToShow}
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
          estimatedItemSize={CARD_WIDTH + CARD_MARGIN * 2}
        />
      )}
    </View>
  );
}
export default GamingEvents;

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
});