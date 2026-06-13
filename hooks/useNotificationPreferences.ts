import { useState, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import auth from "@react-native-firebase/auth";
import NotificationService, {
  NotificationPreferences,
} from "../notificationService";

// Loads, caches, and toggles a user's notification topic preferences.
// Uses an in-memory module-level cache so repeated hook mounts within the
// same session don't trigger redundant Firestore reads.

// ---------------------------------------------------------------------------
// Module-level cache (shared across all instances of this hook)
// ---------------------------------------------------------------------------

let globalPreferencesCache: NotificationPreferences | null = null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  loadingPreferences: boolean;
  toggleSource: (category: string, sourceName: string) => Promise<void>;
  setPreferences: Dispatch<SetStateAction<NotificationPreferences>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useNotificationPreferences =
  (): UseNotificationPreferencesResult => {
    const [preferences, setPreferences] = useState<NotificationPreferences>(
      () => globalPreferencesCache ?? {}
    );
    const [loadingPreferences, setLoadingPreferences] = useState(
      !globalPreferencesCache
    );

    // Load preferences on mount (skips the spinner if the cache is warm).
    useEffect(() => {
      const uid = auth().currentUser?.uid;
      if (!uid) {
        setLoadingPreferences(false);
        return;
      }

      let cancelled = false;

      const load = async (): Promise<void> => {
        if (!globalPreferencesCache) setLoadingPreferences(true);

        try {
          const prefs = await NotificationService.getUserPreferences(uid);
          if (cancelled) return;
          globalPreferencesCache = prefs ?? {};
          setPreferences(globalPreferencesCache);
        } catch (error) {
          console.error("[useNotificationPreferences] Load error:", error);
        } finally {
          if (!cancelled) setLoadingPreferences(false);
        }
      };

      load();
      return () => {
        cancelled = true;
      };
    }, []);

    // Optimistic toggle: update state immediately, roll back on failure.
    const toggleSource = useCallback(
      async (category: string, sourceName: string): Promise<void> => {
        const uid = auth().currentUser?.uid;
        if (!uid) return;

        const prefId = NotificationService.getTopicName(category, sourceName);
        const previousValue = globalPreferencesCache?.[prefId] ?? false;
        const nextValue = !previousValue;

        const optimistic: NotificationPreferences = {
          ...(globalPreferencesCache ?? {}),
          [prefId]: nextValue,
        };
        globalPreferencesCache = optimistic;
        setPreferences(optimistic);

        try {
          await NotificationService.toggleNotificationPreference(
            uid,
            category,
            sourceName,
            nextValue
          );
        } catch (error) {
          console.error(
            "[useNotificationPreferences] Failed to save preference:",
            error
          );
          // Roll back both the cache and local state.
          const rolledBack: NotificationPreferences = {
            ...(globalPreferencesCache ?? {}),
            [prefId]: previousValue,
          };
          globalPreferencesCache = rolledBack;
          setPreferences(rolledBack);
        }
      },
      [] // no deps — reads globalPreferencesCache directly via the module ref
    );

    return { preferences, loadingPreferences, toggleSource, setPreferences };
  };