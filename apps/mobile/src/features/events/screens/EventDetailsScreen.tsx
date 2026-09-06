import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import React, { useCallback, useMemo, memo, useEffect, useRef } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { ArrowLeft, Calendar, CirclePlay, Flag, Radio } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import { useCountdown } from "@/src/hooks/useCountdown";
import { formatEventDate, getEventStatus } from "@gaming-zone/utils";
import type { EventStatus } from "@gaming-zone/utils";
import type { EventDetailsParamList } from "../types";
import type { GamingEvent } from "@/src/types/sharedTypes";
import { openLink } from "@/src/lib/browser";
import { CountdownResult } from "@/src/types/sharedTypes";

// Components
import SectionTitle from "@/src/components/SectionTitle";
import GameCard from "../components/GameCard";
import VideoCard from "../components/VideoCard";
import NetworkButton from "../components/NetworkButton";
import CountdownBox from "../components/CountdownBox";

//  Main Screen
const EventDetailsScreen = memo((): React.ReactElement => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EventDetailsParamList, "EventDetailsScreen">>();
  const { t, i18n } = useTranslation();

  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interactionTask = runAfterInteractions(() => {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
    return () => interactionTask.cancel();
  }, [contentOpacity]);

  const event: GamingEvent = route.params.event;
  const status: EventStatus = useMemo(
    () => getEventStatus(event.start_time, event.end_time),
    [event.start_time, event.end_time],
  );

  const timeUntil = useCountdown(
    status === "upcoming" ? event.start_time : null,
  ) as CountdownResult | null;

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleStream = useCallback(() => {
    if (event.live_stream_url) {
      openLink(event.live_stream_url);
    }
  }, [event.live_stream_url]);

  const logoUri = event.event_logo
    ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${event.event_logo.image_id}.webp`
    : null;

  const startDateStr = useMemo(
    () => formatEventDate(event.start_time, i18n.language),
    [event.start_time, i18n.language],
  );
  const endDateStr = useMemo(
    () => formatEventDate(event.end_time, i18n.language),
    [event.end_time, i18n.language],
  );

  const streamBtnColors: [string, string] =
    status === "live" ? ["#FF3B30", "#FF6B6B"] : [COLORS.secondary, COLORS.lightGray];

  return (
    <View style={styles.screen}>
      {/* â”€â”€ Hero â”€â”€ */}
      <View style={styles.hero}>
        {logoUri ? (
          <Image
            recyclingKey={event.event_logo?.image_id ?? "hero"}
            source={logoUri}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Image
            source={require("@/assets/image-not-found.webp")}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        )}
        <LinearGradient
          colors={["rgba(12,26,51,0.2)", "rgba(12,26,51,1)"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleGoBack}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>

        {/* Status badge */}
        <View style={styles.heroBadgeRow}>
          {status === "live" && (
            <LinearGradient colors={["#FF3B30", "#FF6B6B"]} style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <CustomText style={styles.liveText}>
                {t("home.gamingEvents.live")}
              </CustomText>
            </LinearGradient>
          )}
          {status === "upcoming" && (
            <View style={styles.upcomingBadge}>
              <CustomText style={styles.upcomingText}>
                {t("home.gamingEvents.upcoming")}
              </CustomText>
            </View>
          )}
          {status === "ended" && (
            <View style={styles.endedBadge}>
              <CustomText style={styles.endedText}>Ended</CustomText>
            </View>
          )}
        </View>

        <CustomText style={styles.heroTitle}>{event.name}</CustomText>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.View style={[styles.scroll, { opacity: contentOpacity }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Dates */}
          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <View collapsable={false}>
                <Calendar size={18} color={COLORS.lightGray} />
              </View>
              <View>
                <CustomText style={styles.dateBlockLabel}>Starts</CustomText>
                <CustomText style={styles.dateBlockValue}>{startDateStr}</CustomText>
              </View>
            </View>
            <View style={styles.dateBlock}>
              <View collapsable={false}>
                <Flag size={18} color={COLORS.lightGray} />
              </View>
              <View>
                <CustomText style={styles.dateBlockLabel}>Ends</CustomText>
                <CustomText style={styles.dateBlockValue}>{endDateStr}</CustomText>
              </View>
            </View>
          </View>

          {/* Countdown */}
          {timeUntil && (
            <View style={styles.section}>
              <SectionTitle title={t("events.startsIn") || "Starts In"} />
              <View style={styles.countdownRow}>
                <CountdownBox value={timeUntil.days} label="Days" />
                <CustomText style={styles.countdownSep}>:</CustomText>
                <CountdownBox value={timeUntil.hours} label="Hours" />
                <CustomText style={styles.countdownSep}>:</CustomText>
                <CountdownBox value={timeUntil.minutes} label="Min" />
                <CustomText style={styles.countdownSep}>:</CustomText>
                <CountdownBox value={timeUntil.seconds} label="Sec" />
              </View>
            </View>
          )}

          {/* Watch / Stream Button */}
          {event.live_stream_url && (
            <TouchableOpacity
              onPress={handleStream}
              activeOpacity={0.85}
              style={styles.streamBtnWrap}
            >
              <LinearGradient
                colors={streamBtnColors}
                style={styles.streamBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {status === "live" ? (
                  <View collapsable={false}>
                    <Radio size={22} color="#fff" />
                  </View>
                ) : (
                  <View collapsable={false}>
                    <CirclePlay size={22} color="#fff" />
                  </View>
                )}
                <CustomText style={styles.streamBtnText}>
                  {status === "live"
                    ? t("home.gamingEvents.watchNowButton")
                    : t("home.gamingEvents.detailsButton")}
                </CustomText>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Description */}
          {event.description ? (
            <View style={styles.section}>
              <SectionTitle title={t("events.about") || "About"} />
              <CustomText style={styles.description}>{event.description}</CustomText>
            </View>
          ) : null}

          {/* Social / Links */}
          {event.event_networks && event.event_networks.length > 0 && (
            <View style={styles.section}>
              <SectionTitle title={t("events.links") || "Links & Social"} />
              <View style={styles.networksWrap}>
                {event.event_networks.map((net, i) => (
                  <NetworkButton key={i} network={net} />
                ))}
              </View>
            </View>
          )}

          {/* Videos */}
          {event.videos && event.videos.length > 0 && (
            <View style={styles.section}>
              <SectionTitle title="Videos" />
              <FlashList
                renderScrollComponent={GHScrollView as any}
                data={event.videos}
                horizontal
                keyExtractor={(v) => v.video_id}
                renderItem={({ item }) => <VideoCard video={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
                scrollEnabled
              />
            </View>
          )}

          {/* â”€â”€ Featured Games â”€â”€ */}
          {event.games && event.games.length > 0 && (
            <View style={styles.section}>
              <SectionTitle title={t("events.featuredGames") || "Featured Games"} />
              <FlashList
                renderScrollComponent={GHScrollView as any}
                data={event.games}
                horizontal
                keyExtractor={(g) => String(g.id)}
                renderItem={({ item }) => <GameCard game={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
                scrollEnabled
              />
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
});
EventDetailsScreen.displayName = "EventDetailsScreen";
export default EventDetailsScreen;

//  Styles
const HERO_HEIGHT = 280;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.primary,
    marginBottom: 52,
  },
  // Hero
  hero: {
    width: "100%",
    height: HERO_HEIGHT,
    justifyContent: "flex-end",
    padding: 20,
  },
  backBtn: {
    position: "absolute",
    top: 44,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(12,26,51,0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  heroBadgeRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    lineHeight: 34,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  // Badges
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  liveText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  upcomingBadge: {
    backgroundColor: COLORS.secondary + "80",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  upcomingText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  endedBadge: {
    backgroundColor: "#44444480",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#888",
  },
  endedText: { color: "#aaa", fontSize: 11, fontWeight: "bold" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 18 },
  // Dates row
  datesRow: {
    gap: 10,
    marginBottom: 8,
  },
  dateBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.secondary + "25",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary + "50",
  },
  dateBlockLabel: {
    color: COLORS.lightGray,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateBlockValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  // Section
  section: { marginTop: 24 },
  countdownRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
  },
  countdownSep: {
    color: COLORS.lightGray,
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 14,
  },
  // Stream button
  streamBtnWrap: { marginTop: 20 },
  streamBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  streamBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  // Description
  description: {
    color: "#b7becb",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "left",
    direction: "ltr",
  },
  // Networks
  networksWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
