import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonGamingevents from "../../skeleton/SkeletonGamingevents";
import COLORS from "../../constants/colors";
import { SERVER_URL } from "../../constants/config";
import { useCountdown } from "../../hooks/useCountdown";
import useCachedData from "../../hooks/useCachedData";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 220;
const CARD_MARGIN = 10;

// دالة جلب الأحداث
const fetchEvents = async () => {
  const response = await axios.get(`${SERVER_URL}/events`);
  return response.data;
};

// دالة تنسيق التاريخ
const formatEventDate = (timestamp, language = "en") => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const options = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString(language, options);
};

// دالة الحصول على حالة الحدث
const getEventStatus = (start_time, end_time) => {
  const now = Date.now() / 1000;
  if (now < start_time) return "upcoming";
  if (now >= start_time && now <= end_time) return "live";
  return "ended";
};

const EventCard = React.memo(({ item }) => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();

  const status = getEventStatus(item.start_time, item.end_time);
  const timeUntil = useCountdown(
    status === "upcoming" ? item.start_time : null,
  );

  const handleStreamPress = useCallback(() => {
    if (item.live_stream_url) {
      Linking.openURL(item.live_stream_url).catch(() => {
        console.error("Failed to open URL");
      });
    }
  }, [item.live_stream_url]);

  return (
    <View style={styles.eventCard}>
      {/* Background Image */}
      <Image
        recyclingKey={item?.event_logo?.image_id || ""}
        source={
          item.event_logo
            ? `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${item.event_logo?.image_id}.webp`
            : require("../../assets/image-not-found.webp")
        }
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        allowDownscaling={true}
      />

      {/* Dark Gradient Overlay */}
      <LinearGradient
        colors={["rgba(12, 26, 51, 0.4)", "rgba(12, 26, 51, 0.95)"]}
        style={styles.gradientOverlay}
      />

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Status Badge */}
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
          {/* Event Title */}
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Date & Time Info */}
          {timeUntil && (
            <View style={styles.dateTimeRow}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>
                  {formatEventDate(item.start_time, i18n.language)}
                </Text>
              </View>

              {/* Countdown for upcoming events */}

              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>
                  {timeUntil.days > 0
                    ? `${timeUntil.days}${t("common.time.d")} `
                    : ""}
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

        {/* Action Button */}
        {item.live_stream_url && (
          <TouchableOpacity onPress={handleStreamPress}>
            <LinearGradient
              colors={
                status === "live"
                  ? ["#FF3B30", "#FF6B6B"]
                  : [COLORS.lightGray, "#516996"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>
                {status === "live"
                  ? t("home.gamingEvents.watchNowButton")
                  : status === "upcoming"
                    ? t("home.gamingEvents.detailsButton")
                    : t("home.gamingEvents.viewResults")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Glow effect for live events */}
      {status === "live" && <View style={styles.liveGlow} />}
    </View>
  );
});

export default function GamingEvents() {
  const { t } = useTranslation();
  const STORAGE_KEY = "GAMES_CACHE_EVENTS";
  const {
    data: events,
    isLoading,
    error,
  } = useCachedData(STORAGE_KEY, fetchEvents, []);

  // البيانات المعروضة
  const eventsToShow = events || [];
  const isActuallyLoading =
    isLoading && (eventsToShow.length === 0 || !eventsToShow);

  const renderItem = useCallback(({ item }) => <EventCard item={item} />, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: CARD_WIDTH + CARD_MARGIN * 2,
      offset: (CARD_WIDTH + CARD_MARGIN * 2) * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>{t("home.gamingEvents.header")}</Text>

      {/* Events List */}
      {isActuallyLoading && (
        <FlatList
          data={Array.from({ length: 3 }).map((_, i) => ({ id: i }))}
          horizontal
          renderItem={() => <SkeletonGamingevents />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {error && eventsToShow.length === 0 && (
        <Text style={styles.error}>{t("games.list.serverError")}</Text>
      )}

      {!isActuallyLoading && eventsToShow.length === 0 && !error && (
        <Text style={styles.noResults}>{t("home.gamingEvents.noEvents")}</Text>
      )}

      {eventsToShow.length > 0 && (
        <FlatList
          data={eventsToShow}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
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
  container: {
    marginTop: 40,
  },
  header: {
    fontSize: 28,
    color: COLORS.textLight,
    marginLeft: 20,
    marginBottom: 15,
    fontWeight: "bold",
  },
  listContent: {
    padding: 10,
  },
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
  contentContainer: {
    flex: 1,
    padding: 16,
    // justifyContent: "space-between",
  },
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
  upcomingText: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "bold",
  },
  infoContainer: {
    gap: 8,
    justifyContent: "flex-end",
    flexGrow: 1,
    marginBottom: 14,
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
  dateText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "600",
  },
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
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  actionButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
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
    shadowColor: "#ff3a304d",
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
