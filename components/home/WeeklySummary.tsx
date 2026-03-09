import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import Markdown from "react-native-markdown-display";
import Loading from "../../Loading";
import { databases } from "../../lib/appwrite";
import { Query } from "react-native-appwrite";
import i18n from "../../i18n";
import COLORS from "../../constants/colors";
import { t } from "i18next";
import Constants from "expo-constants";
import { WeeklySummaryDoc } from "../types";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig!.extra as {
  APPWRITE_DATABASE_ID: string;
};
const DATABASE_ID = APPWRITE_DATABASE_ID;
const SUMMARIES_COLLECTION_ID = "weekly_summaries";

const COLLAPSED_HEIGHT = 100;

const WeeklySummary: React.FC = () => {
  const [summaryDoc, setSummaryDoc] = useState<WeeklySummaryDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false);

  // Full height measured from the inner content layout
  const [contentHeight, setContentHeight] = useState<number>(0);

  // Animated value starts at collapsed height
  const animatedHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  useEffect(() => {
    const fetchSummary = async (): Promise<void> => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          SUMMARIES_COLLECTION_ID,
          [Query.orderDesc("$createdAt"), Query.limit(1)],
        );

        if (response.documents.length > 0) {
          setSummaryDoc(response.documents[0] as unknown as WeeklySummaryDoc);
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // Animate between collapsed and expanded states whenever either value changes
  useEffect(() => {
    if (contentHeight > 0) {
      Animated.timing(animatedHeight, {
        toValue: expanded ? contentHeight : COLLAPSED_HEIGHT,
        duration: 300,
        useNativeDriver: false, // Height animation cannot use the native driver
      }).start();
    }
  }, [expanded, contentHeight]);

  if (loading) return <Loading />;
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

  const handleContentLayout = (event: LayoutChangeEvent): void => {
    const layoutHeight = event.nativeEvent.layout.height;
    if (layoutHeight > COLLAPSED_HEIGHT) {
      setContentHeight(layoutHeight);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: "column" }}>
          <Text style={styles.headerTitle}>
            {currentLang === "ar" ? "🗞️ ملخص الأسبوع" : "🗞️ Weekly Recap"}
          </Text>
          <Text style={styles.date}>Created by Gemini 1.5 Flash</Text>
        </View>
        <Text style={styles.date}>
          {new Date(summaryDoc.$createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Animated.View
        style={[styles.animatedContainer, { height: animatedHeight }]}
      >
        <View onLayout={handleContentLayout} style={styles.innerContent}>
          <Markdown style={markdownStyles}>{content}</Markdown>
        </View>
      </Animated.View>

      {/* Read more / read less toggle */}
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