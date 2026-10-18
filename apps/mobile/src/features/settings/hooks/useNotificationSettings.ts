import { useCallback, useState } from "react";
import { ToastAndroid } from "react-native";
import auth from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import NotificationService from "@/src/services/notificationService";
import type { NotificationPreferences } from "@/src/services/notificationService";
import { logger } from "@/src/lib/logger";

export type UseNotificationSettingsResult = {
  isLoading: boolean;
  preferences: NotificationPreferences;
  expandedCategories: Record<string, boolean>;
  toggleCategoryExpansion: (category: string) => void;
  toggleSource: (category: string, sourceName: string) => Promise<void>;
  /** Optimistic on/off for a whole category topic (free games, weekly summary). */
  toggleAlert: (category: string, source: string) => Promise<void>;
  isTopicEnabled: (category: string, source: string) => boolean;
};

/**
 * Notification preferences plus the accordion state for the settings list.
 *
 * Source toggles delegate to `useNotificationPreferences`, which already
 * performs the optimistic update and rollback. The category-wide alert toggles
 * (which have no source row of their own) repeat that contract here.
 */
export function useNotificationSettings(): UseNotificationSettingsResult {
  const { t } = useTranslation();
  const { preferences, loadingPreferences, toggleSource, setPreferences } =
    useNotificationPreferences();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    {},
  );

  const toggleCategoryExpansion = useCallback((category: string): void => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const toggleAlert = useCallback(
    async (category: string, source: string): Promise<void> => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const topicId = NotificationService.getTopicName(category, source);
      const wasEnabled = preferences[topicId] ?? false;
      const nextValue = !wasEnabled;

      // 1. Paint the new state immediately.
      setPreferences({ ...preferences, [topicId]: nextValue });

      // 2. Persist it, rolling the optimistic update back if that fails.
      try {
        await NotificationService.toggleNotificationPreference(
          userId,
          category,
          source,
          nextValue,
        );
      } catch (error) {
        logger.error("[useNotificationSettings] toggleAlert error:", error);
        setPreferences({ ...preferences, [topicId]: wasEnabled });
        ToastAndroid.show(
          t("settings.notifications.updateFailed") ??
            "Failed to update notification settings. Please try again.",
          ToastAndroid.LONG,
        );
      }
    },
    [preferences, setPreferences, t],
  );

  const isTopicEnabled = useCallback(
    (category: string, source: string): boolean => {
      const topicId = NotificationService.getTopicName(category, source);
      return preferences[topicId] ?? false;
    },
    [preferences],
  );

  return {
    isLoading: loadingPreferences,
    preferences,
    expandedCategories,
    toggleCategoryExpansion,
    toggleSource,
    toggleAlert,
    isTopicEnabled,
  };
}
