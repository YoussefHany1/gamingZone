import React, { useCallback, useEffect, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import Loading from "../../Loading";
import { databases } from "../../lib/appwrite";
import { Query } from "react-native-appwrite";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import Constants from "expo-constants";
import useCachedData from "../../hooks/useCachedData";
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

// ─── Markdown Styles ──────────────────────────────────────────────────────────

/**
 * Defined at module scope to prevent a new object being allocated on every
 * render, which would force react-native-markdown-display to re-process styles.
 */
const markdownStyles = {
  body: { color: "#E0E0E0", fontSize: 14, lineHeight: 24 },
  heading1: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold" as const,
    marginBottom: 10,
  },
  heading2: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold" as const,
    marginTop: 10,
    marginBottom: 5,
  },
  strong: { color: "#8eb0eeff", fontWeight: "bold" as const },
  link: { color: "#4da6ff" },
  bullet_list: { marginBottom: 10 },
};

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

// ─── Component ────────────────────────────────────────────────────────────────

const WeeklySummary = memo(function WeeklySummary() {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const animatedHeight = useSharedValue(COLLAPSED_HEIGHT);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  const {
    data: summaryDoc,
    isLoading,
  } = useCachedData<WeeklySummaryDoc | null>(
    CACHE_KEY,
    fetchWeeklySummary,
    [],
    SUMMARY_TTL_MS,
  );

  // Animate between collapsed and expanded states whenever either changes.
  useEffect(() => {
    if (contentHeight > 0) {
      animatedHeight.value = withTiming(
        expanded ? contentHeight : COLLAPSED_HEIGHT,
        { duration: 300 },
      );
    }
  }, [expanded, contentHeight, animatedHeight]);

  const handleContentLayout = useCallback((event: LayoutChangeEvent): void => {
    const layoutHeight = event.nativeEvent.layout.height;
    if (layoutHeight > COLLAPSED_HEIGHT) {
      setContentHeight(layoutHeight);
    }
  }, []);

  const handleToggleExpand = useCallback(
    () => setExpanded((prev) => !prev),
    [],
  );

  if (isLoading && !summaryDoc) return <Loading />;
  if (!summaryDoc) return null;

  const currentLang: "ar" | "en" = i18n.language.startsWith("ar") ? "ar" : "en";
  const content =
    currentLang === "ar" ? summaryDoc.summary_ar : summaryDoc.summary_en;
  if (!content) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {t("home.seeklySummary.title")}
          </Text>
          <Text style={styles.date}>
            {t("home.seeklySummary.createdBy")} Gemini 2.5 Flash
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(summaryDoc.$createdAt).toLocaleDateString(currentLang)}
        </Text>
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
        <Text style={styles.readMoreText}>
          {expanded
            ? t("home.seeklySummary.readLess")
            : t("home.seeklySummary.readMore")}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default WeeklySummary;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.darkBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 30,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerTitle: {
    color: "#779bdd",
    fontSize: 20,
    fontWeight: "bold",
  },
  date: {
    color: "#888",
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
    borderTopColor: "#333",
  },
  readMoreText: {
    color: "#779bdd",
    fontSize: 14,
    fontWeight: "bold",
  },
});
