import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import CustomText from "@/src/components/CustomText";
import { View, TouchableOpacity, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import Loading from "@/src/Loading";
import { databases } from "@/src/lib/appwrite";
import { Query } from "react-native-appwrite";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ThemeColors } from "@/src/constants/colors";
import Constants from "expo-constants";
import useCachedData from "@/src/hooks/useCachedData";
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
    </View>
  );
});

export default WeeklySummary;

// ─── Styles ───────────────────────────────────────────────────────────────────
