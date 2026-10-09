import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  TouchableOpacity,
  LayoutChangeEvent,
  Platform,
  ToastAndroid,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import * as Notifications from "expo-notifications";
import { Bell, BellOff } from "lucide-react-native";
import auth from "@react-native-firebase/auth";
import Loading from "@/src/Loading";
import { databases } from "@/src/lib/appwrite";
import { Query } from "react-native-appwrite";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import NotificationService from "@/src/services/notificationService";
import type { ThemeColors } from "@/src/constants/colors";
import Constants from "expo-constants";
import useCachedData from "@/src/hooks/useCachedData";
import { storageGet, storageSet } from "@/src/lib/storage";
import { WeeklySummaryDoc } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const { APPWRITE_DATABASE_ID } = Constants.expoConfig!.extra as {
  APPWRITE_DATABASE_ID: string;
};
const SUMMARIES_COLLECTION_ID = "weekly_summaries";
const CACHE_KEY = "WEEKLY_SUMMARY_CACHE";
const COLLAPSED_HEIGHT = 100;
/** 12-hour TTL — the summary is updated weekly, no need for frequent refetches. */
const SUMMARY_TTL_MS = 43_200_000;
/** Same channel the rest of the app uses for news notifications. */
const NEWS_CHANNEL_ID = "news_notifications";
/** MMKV key for the summary document we last alerted the user about. */
const LAST_NOTIFIED_KEY = "WEEKLY_SUMMARY_LAST_NOTIFIED_ID";
/** FCM topic opt-in — matches the cron job's broadcast topic. */
const WEEKLY_SUMMARY_CATEGORY = "weekly_summary";
const WEEKLY_SUMMARY_SOURCE = "alerts";

// ─── Markdown Styles ──────────────────────────────────────────────────────────

/**
 * `react-native-markdown-display` takes a plain style object, not a registered
 * stylesheet, so it is derived per theme and memoized on the palette to avoid
 * re-allocating on every render.
 */
const useMarkdownStyles = (colors: ThemeColors) =>
  useMemo(
    () => ({
      body: { color: colors.text, fontSize: 14, lineHeight: 24 },
      heading1: {
        color: colors.text,
        fontSize: 20,
        fontWeight: "bold" as const,
        marginBottom: 10,
      },
      heading2: {
        color: colors.text,
        fontSize: 18,
        fontWeight: "bold" as const,
        marginTop: 10,
        marginBottom: 5,
      },
      strong: { color: colors.accentText, fontWeight: "bold" as const },
      link: { color: colors.accentText },
      bullet_list: { marginBottom: 10 },
    }),
    [colors],
  );

// ─── Data Fetching ────────────────────────────────────────────────────────────

/** Fetches the most recent weekly summary document from Appwrite. */
const fetchWeeklySummary = async (): Promise<WeeklySummaryDoc | null> => {
  const response = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    SUMMARIES_COLLECTION_ID,
    [Query.orderDesc("$createdAt"), Query.limit(1)],
  );
  return response.documents.length > 0
    ? (response.documents[0] as unknown as WeeklySummaryDoc)
    : null;
};

/**
 * Fires a one-shot local notification on the app's news channel.
 *
 * Safe to call repeatedly: it returns silently when permission is denied and
 * swallows scheduling errors, so a failed alert never breaks the summary UI.
 */
const showSummaryNotification = async (title: string, body: string): Promise<void> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(NEWS_CHANNEL_ID, {
        name: "News Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        categoryIdentifier: NEWS_CHANNEL_ID,
      },
      trigger: null,
    });
  } catch (error) {
    console.error("[WeeklySummary] Failed to show notification:", error);
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const WeeklySummary = memo(function WeeklySummary() {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const colors = useThemeColors();
  const markdownStyles = useMarkdownStyles(colors);

  const styles = useThemeStyles((c) => ({
    card: {
      backgroundColor: c.backgroundDeep,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 30,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingBottom: 8,
    },
    headerLeft: {
      flexDirection: "column",
    },
    headerTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "bold",
    },
    date: {
      color: c.textSubtle,
      fontSize: 12,
    },
    animatedContainer: {
      overflow: "hidden",
    },
    innerContent: {
      position: "absolute",
    },
    readMoreButton: {
      marginTop: 10,
      alignItems: "center",
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    readMoreText: {
      color: c.accentText,
      fontSize: 14,
      fontWeight: "bold",
    },
    subscribeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: "transparent",
    },
    subscribeButtonActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    subscribeText: {
      color: c.accentText,
      fontSize: 14,
      fontWeight: "600",
    },
    subscribeTextActive: {
      color: c.onAccent,
    },
  }));

  const animatedHeight = useSharedValue(COLLAPSED_HEIGHT);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  const { data: summaryDoc, isLoading } = useCachedData<WeeklySummaryDoc | null>(
    CACHE_KEY,
    fetchWeeklySummary,
    [],
    SUMMARY_TTL_MS,
  );

  // Weekly-recap notification opt-in, shared with the Settings screen via the
  // same Firestore-backed preference and FCM topic subscription.
  const { preferences, toggleSource } = useNotificationPreferences();
  const subscribed = useMemo(
    () =>
      preferences[
        NotificationService.getTopicName(WEEKLY_SUMMARY_CATEGORY, WEEKLY_SUMMARY_SOURCE)
      ] ?? false,
    [preferences],
  );

  // Alert once per newly-published summary, only while subscribed. The
  // last-notified ID is persisted in MMKV, so re-mounts and language changes
  // never re-fire for the same doc; a fetch that returns a newer document is
  // the only thing that triggers it.
  useEffect(() => {
    if (!subscribed) return;
    const id = summaryDoc?.$id;
    if (!id) return;
    if (storageGet<string>(LAST_NOTIFIED_KEY) === id) return;
    storageSet(LAST_NOTIFIED_KEY, id);
    void showSummaryNotification(
      t("home.weeklySummary.notification.title"),
      t("home.weeklySummary.notification.body"),
    );
  }, [summaryDoc, subscribed, t]);

  const handleToggleSubscribe = useCallback(async (): Promise<void> => {
    if (!auth().currentUser?.uid) {
      ToastAndroid.show(t("common.loginRequired"), ToastAndroid.LONG);
      return;
    }
    const next = !subscribed;
    await toggleSource(WEEKLY_SUMMARY_CATEGORY, WEEKLY_SUMMARY_SOURCE);
    ToastAndroid.show(
      next ? t("home.weeklySummary.subscribed") : t("home.weeklySummary.unsubscribed"),
      ToastAndroid.LONG,
    );
  }, [subscribed, toggleSource, t]);

  // Animate between collapsed and expanded states whenever either changes.
  useEffect(() => {
    if (contentHeight > 0) {
      animatedHeight.value = withTiming(expanded ? contentHeight : COLLAPSED_HEIGHT, {
        duration: 300,
      });
    }
  }, [expanded, contentHeight, animatedHeight]);

  const handleContentLayout = useCallback((event: LayoutChangeEvent): void => {
    const layoutHeight = event.nativeEvent.layout.height;
    if (layoutHeight > COLLAPSED_HEIGHT) {
      setContentHeight(layoutHeight);
    }
  }, []);

  const handleToggleExpand = useCallback(() => setExpanded((prev) => !prev), []);

  if (isLoading && !summaryDoc) return <Loading />;
  if (!summaryDoc) return null;

  const currentLang: "ar" | "en" = i18n.language.startsWith("ar") ? "ar" : "en";
  const content = currentLang === "ar" ? summaryDoc.summary_ar : summaryDoc.summary_en;
  if (!content) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <CustomText style={styles.headerTitle}>
            {t("home.weeklySummary.title")}
          </CustomText>
          <CustomText style={styles.date}>
            {t("home.weeklySummary.createdBy")} Gemini 2.5 Flash
          </CustomText>
        </View>
        <CustomText style={styles.date}>
          {new Date(summaryDoc.$createdAt).toLocaleDateString(currentLang)}
        </CustomText>
      </View>

      <Animated.View style={[styles.animatedContainer, animatedStyle]}>
        {/* `position: absolute` is required so onLayout can measure the full
            unconstrained height while the parent clips it via `overflow: hidden`. */}
        <View onLayout={handleContentLayout} style={styles.innerContent}>
          <Markdown style={markdownStyles}>{content}</Markdown>
        </View>
      </Animated.View>

      <TouchableOpacity
        onPress={handleToggleExpand}
        style={styles.readMoreButton}
        activeOpacity={0.7}
      >
        <CustomText style={styles.readMoreText}>
          {expanded ? t("home.weeklySummary.readLess") : t("home.weeklySummary.readMore")}
        </CustomText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.subscribeButton, subscribed && styles.subscribeButtonActive]}
        onPress={handleToggleSubscribe}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          subscribed
            ? t("home.weeklySummary.unsubscribeAccessibility")
            : t("home.weeklySummary.subscribeAccessibility")
        }
      >
        {subscribed ? (
          <Bell size={16} color={colors.onAccent} />
        ) : (
          <BellOff size={16} color={colors.accent} />
        )}
        <CustomText
          style={[styles.subscribeText, subscribed && styles.subscribeTextActive]}
        >
          {subscribed
            ? t("home.weeklySummary.notificationsOn")
            : t("home.weeklySummary.subscribe")}
        </CustomText>
      </TouchableOpacity>
    </View>
  );
});

export default WeeklySummary;

// ─── Styles ───────────────────────────────────────────────────────────────────
