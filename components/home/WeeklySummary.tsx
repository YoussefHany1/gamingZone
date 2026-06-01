import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import Loading from "../../Loading";
import { databases } from "../../lib/appwrite";
import { Query } from "react-native-appwrite";
import i18n from "../../i18n";
import COLORS from "../../constants/colors";
import { t } from "i18next";
import Constants from "expo-constants";
import useCachedData from "../../hooks/useCachedData";
import { WeeklySummaryDoc } from "../types";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig!.extra as {
  APPWRITE_DATABASE_ID: string;
};
const DATABASE_ID = APPWRITE_DATABASE_ID;
const SUMMARIES_COLLECTION_ID = "weekly_summaries";
const CACHE_KEY = "WEEKLY_SUMMARY_CACHE";
const COLLAPSED_HEIGHT = 100;

// Fetch the latest weekly summary document from Appwrite
const fetchWeeklySummary = async (): Promise<WeeklySummaryDoc | null> => {
  const response = await databases.listDocuments(
    DATABASE_ID,
    SUMMARIES_COLLECTION_ID,
    [Query.orderDesc("$createdAt"), Query.limit(1)],
  );
  if (response.documents.length > 0) {
    return response.documents[0] as unknown as WeeklySummaryDoc;
  }
  return null;
};

const WeeklySummary: React.FC = () => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const animatedHeight = useSharedValue(COLLAPSED_HEIGHT);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  const {
    data: summaryDoc,
    isLoading: loading,
  } = useCachedData<WeeklySummaryDoc | null>(
    CACHE_KEY,
    fetchWeeklySummary,
    [],
    43200000, // 12-hour TTL — summary is updated weekly, no need for frequent refetches
  );

  // Animate between collapsed and expanded states
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

  if (loading && !summaryDoc) return <Loading />;
  if (!summaryDoc) return null;

  const localeCode: string = i18n.language || "en";
  const currentLang: "ar" | "en" = localeCode.startsWith("ar") ? "ar" : "en";

  const content = currentLang === "ar" ? summaryDoc.summary_ar : summaryDoc.summary_en;
  if (!content) return null;

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

  return (
    <View style={styles.card}>
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: "column" }}>
          <Text style={styles.headerTitle}>
            {t("home.seeklySummary.title")}
          </Text>
          <Text style={styles.date}>{t("home.seeklySummary.createdBy")} Gemini 2.5 Flash</Text>
        </View>
        <Text style={styles.date}>
          {new Date(summaryDoc.$createdAt).toLocaleDateString(currentLang)}
        </Text>
      </View>

      <Animated.View style={[styles.animatedContainer, animatedStyle]}>
        <View onLayout={handleContentLayout} style={styles.innerContent}>
          <Markdown style={markdownStyles}>{content}</Markdown>
        </View>
      </Animated.View>

      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
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
};
export default WeeklySummary;

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
