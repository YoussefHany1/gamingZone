import { useEffect } from "react";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Prompts the user for a store review after DAYS_BEFORE_RATING days from first launch

// Constants
const RATE_KEY = "has_rated_app" as const;
const LAUNCH_DATE_KEY = "first_launch_date" as const;
const DAYS_BEFORE_RATING = 3 as const;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// main 
const useRateApp = (): void => {
  useEffect(() => {
    const checkRatingEligibility = async (): Promise<void> => {
      try {
        // already shown the review prompt before
        const hasRated = await AsyncStorage.getItem(RATE_KEY);
        if (hasRated === "true") return;

        const now = Date.now();
        const firstLaunchRaw = await AsyncStorage.getItem(LAUNCH_DATE_KEY);

        if (firstLaunchRaw === null) {
          // record the timestamp and exit in First launch 
          await AsyncStorage.setItem(LAUNCH_DATE_KEY, now.toString());
          return;
        }

        // not enough days have passed yet
        const diffInDays =
          (now - parseInt(firstLaunchRaw, 10)) / MS_PER_DAY;

        if (diffInDays < DAYS_BEFORE_RATING) return;

        //  device must support in-app review
        const canReview = await StoreReview.hasAction();
        if (!canReview) return;

        await StoreReview.requestReview();

        // Mark as shown so we never attempt to trigger it again
        await AsyncStorage.setItem(RATE_KEY, "true");
      } catch (error) {
        console.warn("[useRateApp] Error checking rating eligibility:", error);
      }
    };

    checkRatingEligibility();
  }, []); // runs exactly once on mount
};

export default useRateApp;