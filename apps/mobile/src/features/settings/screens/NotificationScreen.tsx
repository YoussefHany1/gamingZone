import React, { useCallback } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Gift } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useDeferredReady } from "@/src/hooks/useDeferredReady";
import useRssFeeds from "@/src/hooks/useRssFeeds";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import Loading from "@/src/Loading";
import AdSlot from "@/src/components/AdSlot";
import AlertToggleCard from "../components/notifications/AlertToggleCard";
import NotificationCategorySection from "../components/notifications/NotificationCategorySection";
import NotificationTestButton from "../components/notifications/NotificationTestButton";
import { useNotificationSettings } from "../hooks/useNotificationSettings";
import {
  FREE_GAMES_CATEGORY,
  FREE_GAMES_SOURCE,
  NEWS_CATEGORIES,
  WEEKLY_SUMMARY_CATEGORY,
  WEEKLY_SUMMARY_SOURCE,
} from "../lib/notificationGroups";

const NotificationScreen = (): React.ReactElement => {
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollView: {
      paddingHorizontal: 20,
    },
    header: {
      paddingTop: 20,
      marginBottom: 30,
    },
    subtitle: {
      fontSize: 16,
      color: c.textMuted,
      lineHeight: 22,
    },
    footerText: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
  }));

  const isReady = useDeferredReady();
  const { rssFeeds, loading: isLoadingFeeds } = useRssFeeds();

  const {
    isLoading,
    preferences,
    expandedCategories,
    toggleCategoryExpansion,
    toggleSource,
    toggleAlert,
    isTopicEnabled,
  } = useNotificationSettings();

  const toggleFreeGames = useCallback((): void => {
    void toggleAlert(FREE_GAMES_CATEGORY, FREE_GAMES_SOURCE);
  }, [toggleAlert]);

  const toggleWeeklySummary = useCallback((): void => {
    void toggleAlert(WEEKLY_SUMMARY_CATEGORY, WEEKLY_SUMMARY_SOURCE);
  }, [toggleAlert]);

  if (isLoading || isLoadingFeeds) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <CustomText style={styles.subtitle}>
            {t("settings.notifications.description")}
          </CustomText>
        </View>

        {NEWS_CATEGORIES.map((category) => (
          <NotificationCategorySection
            key={category}
            category={category}
            title={t(`news.tabs.${category}`)}
            sources={rssFeeds[category] ?? []}
            preferences={preferences}
            isExpanded={expandedCategories[category] ?? false}
            onToggleExpansion={toggleCategoryExpansion}
            onToggleSource={toggleSource}
          />
        ))}

        <AlertToggleCard
          icon={Gift}
          title={t("games.list.freeGames.header")}
          enabled={isTopicEnabled(FREE_GAMES_CATEGORY, FREE_GAMES_SOURCE)}
          onToggle={toggleFreeGames}
        />

        <AlertToggleCard
          icon={Bell}
          title={t("home.weeklySummary.title")}
          enabled={isTopicEnabled(WEEKLY_SUMMARY_CATEGORY, WEEKLY_SUMMARY_SOURCE)}
          onToggle={toggleWeeklySummary}
        />

        <CustomText style={styles.footerText}>
          {t("settings.notifications.footer")}
        </CustomText>

        <AdSlot visible={isReady} />

        <NotificationTestButton />
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationScreen;
