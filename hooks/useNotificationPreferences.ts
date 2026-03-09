import { useState, useEffect, useCallback } from "react";
import auth from "@react-native-firebase/auth";
import NotificationService, {
  NotificationPreferences,
} from "../notificationService";

// Show the user notification preferences

let globalPreferencesCache: NotificationPreferences | null = null;

// Types
export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  loadingPreferences: boolean;
  toggleSource: (category: string, sourceName: string) => Promise<void>;
  setPreferences: React.Dispatch<React.SetStateAction<NotificationPreferences>>;
}

// main
export const useNotificationPreferences =
  (): UseNotificationPreferencesResult => {
    const [preferences, setPreferences] = useState<NotificationPreferences>(
      globalPreferencesCache ?? {}
    );
    const [loadingPreferences, setLoadingPreferences] = useState<boolean>(
      !globalPreferencesCache
    );

    // Load on mount

    useEffect(() => {
      const currentUser = auth().currentUser;

      if (currentUser) {
        loadUserPreferences(currentUser.uid);
      } else {
        setLoadingPreferences(false);
      }
      // Run once on mount
    }, []);

    const loadUserPreferences = async (userId: string): Promise<void> => {
      // Only show the spinner on the first load
      if (!globalPreferencesCache) setLoadingPreferences(true);

      try {
        const prefs = await NotificationService.getUserPreferences(userId);
        globalPreferencesCache = prefs ?? {};
        setPreferences(globalPreferencesCache);
      } catch (error) {
        console.error("[useNotificationPreferences] Load error:", error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    // Toggle
    const toggleSource = useCallback(
      async (category: string, sourceName: string): Promise<void> => {
        const userId = auth().currentUser?.uid;
        if (!userId) return;

        const prefId = NotificationService.getTopicName(category, sourceName);
        const previousValue = preferences[prefId] ?? false;
        const nextValue = !previousValue;

        // cache first, then state
        const optimisticPrefs: NotificationPreferences = {
          ...(globalPreferencesCache ?? {}),
          [prefId]: nextValue,
        };
        globalPreferencesCache = optimisticPrefs;
        setPreferences(optimisticPrefs);

        try {
          await NotificationService.toggleNotificationPreference(
            userId,
            category,
            sourceName,
            nextValue
          );
        } catch (error) {
          // Roll back to the previous value on failure
          console.error(
            "[useNotificationPreferences] Failed to save preference:",
            error
          );
          const rolledBack: NotificationPreferences = {
            ...(globalPreferencesCache ?? {}),
            [prefId]: previousValue,
          };
          globalPreferencesCache = rolledBack;
          setPreferences(rolledBack);
        }
      },
      [preferences]
    );

    return {
      preferences,
      loadingPreferences,
      toggleSource,
      setPreferences,
    };
  };