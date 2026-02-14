import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import Markdown from "react-native-markdown-display";
import Loading from "../../Loading";
import { databases } from "../../lib/appwrite";
import { Query } from "react-native-appwrite";
import i18n from "../../i18n";
import COLORS from "../../constants/colors";
import { t } from "i18next";
import Constants from "expo-constants";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig.extra;
const DATABASE_ID = APPWRITE_DATABASE_ID;
const SUMMARIES_COLLECTION_ID = "weekly_summaries";

const WeeklySummary = () => {
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // 2. متغير لحفظ الارتفاع الكامل للمحتوى
  const [contentHeight, setContentHeight] = useState(0);

  // 3. قيمة الأنميشن (نبدأ بـ 100 بيكسل)
  const animatedHeight = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          SUMMARIES_COLLECTION_ID,
          [Query.orderDesc("$createdAt"), Query.limit(1)],
        );

        if (response.documents.length > 0) {
          setSummaryDoc(response.documents[0]);
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // 4. تنفيذ الأنميشن عند تغير حالة expanded
  useEffect(() => {
    if (contentHeight > 0) {
      Animated.timing(animatedHeight, {
        toValue: expanded ? contentHeight : 100, // إذا مفتوح: الارتفاع الكامل، إذا مغلق: 100
        duration: 300, // سرعة الحركة (300 ملي ثانية)
        useNativeDriver: false, // يجب أن يكون false لأننا نغير الارتفاع (Height)
      }).start();
    }
  }, [expanded, contentHeight]);

  if (loading) {
    return <Loading />;
  }

  if (!summaryDoc) return null;

  const localeCode = i18n.locale || i18n.language || "en";
  const currentLang = localeCode.startsWith("ar") ? "ar" : "en";

  const content =
    currentLang === "ar" ? summaryDoc.summary_ar : summaryDoc.summary_en;

  if (!content) return null;

  const markdownStyles = {
    body: { color: "#E0E0E0", fontSize: 14, lineHeight: 24 },
    heading1: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
    },
    heading2: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
      marginTop: 10,
      marginBottom: 5,
    },
    strong: { color: "#8eb0eeff", fontWeight: "bold" },
    link: { color: "#4da6ff" },
    bullet_list: { marginBottom: 10 },
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
        <View
          onLayout={(event) => {
            const layoutHeight = event.nativeEvent.layout.height;
            if (layoutHeight > 100) {
              setContentHeight(layoutHeight);
            }
          }}
          style={styles.innerContent}
        >
          <Markdown style={markdownStyles}>{content}</Markdown>
        </View>
      </Animated.View>

      {/* read more button */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.readMoreButton}
        activeOpacity={0.7}
      >
        <Text style={styles.readMoreText}>
          {expanded
            ? currentLang === "ar"
              ? t("home.seeklySummary.readLess")
              : t("home.seeklySummary.readLess")
            : currentLang === "ar"
              ? t("home.seeklySummary.readMore")
              : t("home.seeklySummary.readMore")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

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
    // width: "100%",
    // top: 0,
  },
  readMoreButton: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
    // zIndex: 10,
  },
  readMoreText: {
    color: "#779bdd",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default WeeklySummary;
