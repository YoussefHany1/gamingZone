import { useEffect } from "react";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Prompts the user for a Play Store / App Store review once, after the app
// has been installed for at least DAYS_BEFORE_RATING days.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RATE_KEY = "has_rated_app";
const LAUNCH_DATE_KEY = "first_launch_date";
const DAYS_BEFORE_RATING = 3;
const MS_PER_DAY = 1_000 * 60 * 60 * 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrRecordFirstLaunch(now: number): Promise<number | null> {
  const stored = await AsyncStorage.getItem(LAUNCH_DATE_KEY);

  if (stored === null) {
    // First launch — record the timestamp and signal "not yet eligible".
    await AsyncStorage.setItem(LAUNCH_DATE_KEY, String(now));
    return null;
  }

  const parsed = parseInt(stored, 10);

  if (isNaN(parsed)) {
    // Corrupted value — reset and signal "not yet eligible".
    await AsyncStorage.setItem(LAUNCH_DATE_KEY, String(now));
    return null;
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const useRateApp = (): void => {
  useEffect(() => {
    const checkRatingEligibility = async (): Promise<void> => {
      try {
        const hasRated = await AsyncStorage.getItem(RATE_KEY);
        if (hasRated === "true") return;

        const now = Date.now();
        const firstLaunchMs = await getOrRecordFirstLaunch(now);
        if (firstLaunchMs === null) return;

        const daysInstalled = (now - firstLaunchMs) / MS_PER_DAY;
        if (daysInstalled < DAYS_BEFORE_RATING) return;

        const isSupported = await StoreReview.hasAction();
        if (!isSupported) return;

        await StoreReview.requestReview();

        // Persist so we never prompt again, regardless of whether the user
        // actually submitted a review (the OS may silently suppress the dialog).
        await AsyncStorage.setItem(RATE_KEY, "true");
      } catch (error) {
        console.warn("[useRateApp] Error checking rating eligibility:", error);
      }
    };

    checkRatingEligibility();
  }, []); // runs exactly once on mount
};

export default useRateApp;