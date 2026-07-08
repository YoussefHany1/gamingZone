import { useEffect } from "react";
import { AppState } from "react-native";
import * as StoreReview from "expo-store-review";
import { storage } from "../lib/storage";

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
// Helpers — now fully synchronous with MMKV
// ---------------------------------------------------------------------------

function getOrRecordFirstLaunch(now: number): number | null {
  const stored = storage.getString(LAUNCH_DATE_KEY);

  if (stored === undefined) {
    // First launch — record the timestamp and signal "not yet eligible".
    storage.set(LAUNCH_DATE_KEY, String(now));
    return null;
  }

  const parsed = parseInt(stored, 10);

  if (isNaN(parsed)) {
    // Corrupted value — reset and signal "not yet eligible".
    storage.set(LAUNCH_DATE_KEY, String(now));
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
        // Synchronous reads — no await, no bridge round-trip
        const hasRated = storage.getString(RATE_KEY);
        if (hasRated === "true") return;

        const now = Date.now();
        const firstLaunchMs = getOrRecordFirstLaunch(now);
        if (firstLaunchMs === null) return;

        const daysInstalled = (now - firstLaunchMs) / MS_PER_DAY;
        if (daysInstalled < DAYS_BEFORE_RATING) return;

        const isSupported = await StoreReview.hasAction();
        if (!isSupported) return;

        // Ensure the app is in the foreground before showing the dialog
        // to prevent "The current activity is no longer available" native crashes.
        if (AppState.currentState !== "active") return;

        await StoreReview.requestReview();

        // Persist so we never prompt again, regardless of whether the user
        // actually submitted a review (the OS may silently suppress the dialog).
        storage.set(RATE_KEY, "true");
      } catch (error) {
        console.warn("[useRateApp] Error checking rating eligibility:", error);
      }
    };

    checkRatingEligibility();
  }, []); // runs exactly once on mount
};

export default useRateApp;
