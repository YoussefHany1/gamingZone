import React, { useState, useEffect, useCallback } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  ImageStyle,
  ToastAndroid,
} from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "../../../Loading";
import { Bell, ChevronDown, ChevronRight, Gift } from "lucide-react-native";
import auth from "@react-native-firebase/auth";
import NotificationService from "@/src/services/notificationService";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { adUnitId } from "@/src/constants/config";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import useRssFeeds from "@/src/hooks/useRssFeeds";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

// تعريف ثوابت الفئة والمصدر لتطابق ما تم وضعه في FreeGames.js
const FREE_GAMES_CATEGORY = "free_games";
const FREE_GAMES_SOURCE = "alerts";

const WEEKLY_SUMMARY_CATEGORY = "weekly_summary";
const WEEKLY_SUMMARY_SOURCE = "alerts";

const Notification: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    title: {
      color: c.text,
      fontSize: 22,
      fontWeight: "bold",
    },
    scrollView: {
      paddingHorizontal: 20,
    },
    Textheader: {
      paddingTop: 20,
      marginBottom: 30,
    },
    subtitle: {
      fontSize: 16,
      color: c.textMuted,
      lineHeight: 22,
    },
    categorySection: {
      marginBottom: 20,
      backgroundColor: "rgba(119, 155, 221, 0.1)",
      borderRadius: 12,
      overflow: "hidden",
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: c.surface,
    },
    categoryHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    chevronIcon: {
      marginRight: 8,
    },
    categoryTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
      marginRight: 8,
    },
    sourceCount: {
      fontSize: 14,
      color: c.textMuted,
    },
    categorySwitch: {
      transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
      marginLeft: 10,
    },
    sourcesList: {
      paddingVertical: 8,
    },
    groupHeaderContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.background,
    },
    groupHeaderText: {
      color: c.textSubtle,
      fontSize: 13,
      fontWeight: "bold",
      textTransform: "uppercase",
    },
    sourceItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(119, 155, 221, 0.1)",
    },
    sourceInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    sourceIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 12,
    },
    sourceName: {
      fontSize: 16,
      color: c.text,
      fontWeight: "500",
    },
    sourceLanguage: {
      fontSize: 12,
      color: c.textMuted,
      marginLeft: 8,
      backgroundColor: c.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    footer: {
      paddingTop: 15,
      paddingBottom: 90,
      paddingHorizontal: 16,
    },
    testButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginBottom: 12,
    },
    testButtonSecondary: {
      backgroundColor: "#4CAF50",
    },
    testButtonText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    footerText: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    headerPrev: {
      position: "absolute",
      width: 40,
      height: 40,
      top: 50,
      left: 10,
      zIndex: 1000,
    },
    ad: {
      alignItems: "center",
      width: "100%",
      marginVertical: 55,
    },
    adText: {
      color: c.text,
      marginBottom: 10,
    },
  }));

  const { rssFeeds, loading: loadingRss } = useRssFeeds();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    {},
  );
  const [showAds, setShowAds] = useState<boolean>(false);
  const adsEnabled = useAdsEnabled();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const task = runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  const { preferences, loadingPreferences, toggleSource, setPreferences } =
    useNotificationPreferences();

  // --- دالة جديدة: تبديل حالة إشعارات الألعاب المجانية ---
  const toggleFreeGames = async (): Promise<void> => {
    const userId = auth().currentUser?.uid;
    if (!userId) return;

    // تكوين اسم الموضوع (Topic Name) بنفس الطريقة الموحدة
    const topicId = NotificationService.getTopicName(
      FREE_GAMES_CATEGORY,
      FREE_GAMES_SOURCE,
    );

    // معرفة الحالة الحالية
    const isEnabled: boolean = preferences[topicId] || false;
    const newValue = !isEnabled;

    // 1. تحديث الواجهة فوراً (Optimistic Update)
    const newPreferences = { ...preferences, [topicId]: newValue };
    setPreferences(newPreferences);

    // 2. استدعاء الخدمة لحفظ التغيير في Firestore و FCM
    try {
      await NotificationService.toggleNotificationPreference(
        userId,
        FREE_GAMES_CATEGORY,
        FREE_GAMES_SOURCE,
        newValue,
      );
    } catch (error) {
      console.error("[NotificationScreen] toggleFreeGames error:", error);
      // Roll back the optimistic toggle on failure.
      const rolledBack = { ...preferences, [topicId]: !newValue };
      setPreferences(rolledBack);
      ToastAndroid.show(
        t("settings.notifications.updateFailed") ??
          "Failed to update notification settings. Please try again.",
        ToastAndroid.LONG,
      );
    }
  };

  // --- دالة جديدة: تبديل حالة إشعارات الملخص الأسبوعي ---
  const toggleWeeklySummary = async (): Promise<void> => {
    const userId = auth().currentUser?.uid;
    if (!userId) return;

    const topicId = NotificationService.getTopicName(
      WEEKLY_SUMMARY_CATEGORY,
      WEEKLY_SUMMARY_SOURCE,
    );

    const isEnabled: boolean = preferences[topicId] || false;
    const newValue = !isEnabled;

    // 1. تحديث الواجهة فوراً (Optimistic Update)
    const newPreferences = { ...preferences, [topicId]: newValue };
    setPreferences(newPreferences);

    // 2. استدعاء الخدمة لحفظ التغيير في Firestore و FCM
    try {
      await NotificationService.toggleNotificationPreference(
        userId,
        WEEKLY_SUMMARY_CATEGORY,
        WEEKLY_SUMMARY_SOURCE,
        newValue,
      );
    } catch (error) {
      console.error("[NotificationScreen] toggleWeeklySummary error:", error);
      // Roll back the optimistic toggle on failure.
      const rolledBack = { ...preferences, [topicId]: !newValue };
      setPreferences(rolledBack);
      ToastAndroid.show(
        t("settings.notifications.updateFailed") ??
          "Failed to update notification settings. Please try again.",
        ToastAndroid.LONG,
      );
    }
  };

  // --- دالة جديدة: عرض قسم الملخص الأسبوعي ---
  const renderWeeklySummarySection = (): React.ReactElement => {
    const topicId = NotificationService.getTopicName(
      WEEKLY_SUMMARY_CATEGORY,
      WEEKLY_SUMMARY_SOURCE,
    );
    const isEnabled: boolean = preferences[topicId] || false;

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Bell size={24} color={colors.accent} style={styles.chevronIcon} />
            <CustomText style={styles.categoryTitle}>
              {t("home.weeklySummary.title")}
            </CustomText>
          </View>

          <Switch
            value={isEnabled}
            onValueChange={toggleWeeklySummary}
            trackColor={{ false: "#3e3e3e", true: colors.textMuted }}
            thumbColor={isEnabled ? colors.text : "#f4f3f4"}
            style={styles.categorySwitch}
          />
        </View>
      </View>
    );
  };

  const toggleCategoryExpansion = useCallback((category: string): void => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  // --- دالة جديدة: عرض قسم الألعاب المجانية ---
  const renderFreeGamesSection = (): React.ReactElement => {
    // جلب المفتاح الصحيح من الخدمة
    const topicId = NotificationService.getTopicName(
      FREE_GAMES_CATEGORY,
      FREE_GAMES_SOURCE,
    );
    const isEnabled: boolean = preferences[topicId] || false;

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Gift size={24} color={colors.accent} style={styles.chevronIcon} />
            <CustomText style={styles.categoryTitle}>
              {t("games.list.freeGames.header")}
            </CustomText>
          </View>

          <Switch
            value={isEnabled}
            onValueChange={toggleFreeGames}
            trackColor={{ false: "#3e3e3e", true: colors.textMuted }}
            thumbColor={isEnabled ? colors.text : "#f4f3f4"}
            style={styles.categorySwitch}
          />
        </View>
      </View>
    );
  };

  const renderCategorySection = (
    category: string,
    title: string,
  ): React.ReactElement | null => {
    const sources = rssFeeds[category] || [];
    if (sources.length === 0) return null;

    const isExpanded: boolean = expandedCategories[category] ?? false;

    const arabicSources = sources
      .filter((s) => s.language === "ar")
      .sort((a, b) => a.name.localeCompare(b.name));

    const englishSources = sources
      .filter((s) => s.language === "en")
      .sort((a, b) => a.name.localeCompare(b.name));

    const groups: Array<{ title: string; data: typeof sources }> = [];
    const arGroup = {
      title: t("news.dropdown.arabicSources"),
      data: arabicSources,
    };
    const enGroup = {
      title: t("news.dropdown.englishSources"),
      data: englishSources,
    };
    // sort groups based on app language preference
    const isEnglishApp = i18n.language.startsWith("en");
    if (isEnglishApp) {
      if (englishSources.length > 0) groups.push(enGroup);
      if (arabicSources.length > 0) groups.push(arGroup);
    } else {
      if (arabicSources.length > 0) groups.push(arGroup);
      if (englishSources.length > 0) groups.push(enGroup);
    }
    return (
      <View key={category} style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategoryExpansion(category)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeaderLeft}>
            {isExpanded ? (
              <ChevronDown size={20} color={colors.accent} style={styles.chevronIcon} />
            ) : (
              <ChevronRight size={20} color={colors.accent} style={styles.chevronIcon} />
            )}
            <CustomText style={styles.categoryTitle}>{title}</CustomText>
            <CustomText style={styles.sourceCount}>({sources.length})</CustomText>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sourcesList}>
            {groups.map((group, gIndex) => (
              <View key={`${category}-group-${gIndex}`}>
                {/* عرض عنوان المجموعة فقط إذا كان هناك أكثر من مجموعة أو لترتيب الشكل */}
                {groups.length > 0 && (
                  <View style={styles.groupHeaderContainer}>
                    <CustomText style={styles.groupHeaderText}>{group.title}</CustomText>
                  </View>
                )}

                {group.data.map((source, index) => {
                  const prefId = NotificationService.getTopicName(category, source.name);
                  const isEnabled: boolean = preferences[prefId] || false;

                  return (
                    <View key={`${category}-${index}`} style={styles.sourceItem}>
                      <View style={styles.sourceInfo}>
                        <Image
                          source={source.image ?? null}
                          style={styles.sourceIcon as ImageStyle}
                        />
                        <CustomText style={styles.sourceName}>{source.name}</CustomText>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleSource(category, source.name)}
                        trackColor={{ false: "#3e3e3e", true: colors.textMuted }}
                        thumbColor={isEnabled ? colors.text : "#f4f3f4"}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loadingPreferences || loadingRss) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.Textheader}>
          <CustomText style={styles.subtitle}>
            {t("settings.notifications.description")}
          </CustomText>
        </View>

        {renderCategorySection("news", `${t("news.tabs.news")}`)}
        {renderCategorySection("reviews", `${t("news.tabs.reviews")}`)}
        {renderCategorySection("esports", `${t("news.tabs.esports")}`)}
        {renderCategorySection("hardware", `${t("news.tabs.hardware")}`)}
        {renderFreeGamesSection()}
        {renderWeeklySummarySection()}
        <CustomText style={styles.footerText}>
          {t("settings.notifications.footer")}
        </CustomText>
        {showAds && adsEnabled && (
          <View style={styles.ad}>
            <CustomText style={styles.adText}>{t("common.ad")}</CustomText>
            <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={NotificationService.testLocalNotification}
          >
            <Bell size={20} color={colors.text} />
            <CustomText style={styles.testButtonText}>
              {t("settings.notifications.testNotification")}
            </CustomText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
export default Notification;
