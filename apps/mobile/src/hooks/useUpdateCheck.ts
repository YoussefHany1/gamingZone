import { useEffect, useRef } from "react";
import { Alert, Linking, Platform } from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { storage } from "../lib/storage";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";

// Checks once per app version whether a newer build is on the Play Store.
// If one exists, shows a one-time dismissible Alert with an "Update Now" action.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAY_STORE_PACKAGE = "com.yh.gamingzone";

/** Opens the Play Store app directly when installed. */
const PLAY_STORE_MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;

/** Browser fallback for devices without the Play Store app. */
const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

const PLAY_STORE_API_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}&hl=en&gl=US`;

/** AsyncStorage key prefix — keyed per version so alerts reset on each new local build. */
const SHOWN_KEY_PREFIX = "update_alert_shown_v";

/** ms before the Play Store HTML fetch is abandoned. */
const FETCH_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parses "1.2.3" into [1, 2, 3]. Non-numeric parts default to 0. */
function parseVersion(version: string): number[] {
  return version.split(".").map((part) => parseInt(part, 10) || 0);
}

/** Returns true if `remote` is strictly newer than `local`. */
function isNewer(remote: string, local: string): boolean {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  const len = Math.max(r.length, l.length);

  for (let i = 0; i < len; i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

/**
 * Scrapes the latest version string from the Play Store HTML page.
 * Returns null when the page is unreachable or the version pattern is absent.
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html: string;
    try {
      const response = await fetch(PLAY_STORE_API_URL, {
        signal: controller.signal,
      });
      html = await response.text();
    } finally {
      clearTimeout(timeoutId);
    }

    // Current Play Store payload: "141":[[["1.0.3"]]]
    const keyed = html.match(/"141":\[\[\["(\d+\.\d+(?:\.\d+)*)"\]\]/);
    if (keyed?.[1]) return keyed[1];

    // Older payload: ,"1.0.3"]
    const primary = html.match(/",\["(\d+\.\d+(?:\.\d+)*)"\]/);
    if (primary?.[1]) return primary[1];

    // Fallback pattern: [[["1.0.3"]]]
    const fallback = html.match(/\[\[\["(\d+\.\d+(?:\.\d+)*)"\]\]/);
    if (fallback?.[1]) return fallback[1];

    return null;
  } catch {
    return null;
  }
}

/** Opens the Play Store listing, preferring the native app. */
async function openPlayStore(): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_MARKET_URL);
  } catch {
    await Linking.openURL(PLAY_STORE_WEB_URL).catch(() => {
      // Both intents failed — nothing else we can do.
    });
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const useUpdateCheck = (): void => {
  const { t } = useTranslation();
  // This check runs at most once per app version, so it must not re-run when
  // the app language changes. The ref keeps the alert in the current language
  // without adding `t` to the (intentionally empty) dependency list.
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    // The update source is the Google Play listing, so skip on other platforms.
    if (Platform.OS !== "android") return;

    const checkForUpdate = async (): Promise<void> => {
      try {
        const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
        const storageKey = `${SHOWN_KEY_PREFIX}${currentVersion}`;

        // Already shown for this build — bail out immediately.
        const alreadyShown = storage.getString(storageKey);
        if (alreadyShown === "true") return;

        const latestVersion = await fetchLatestVersion();
        if (!latestVersion || !isNewer(latestVersion, currentVersion)) return;

        // Persist before showing — prevents a double-prompt on fast re-renders.
        storage.set(storageKey, "true");

        Alert.alert(
          tRef.current("common.updateAlert.title"),
          tRef.current("common.updateAlert.message"),
          [
            { text: tRef.current("common.updateAlert.later"), style: "cancel" },
            {
              text: tRef.current("common.updateAlert.updateNow"),
              onPress: () => void openPlayStore(),
            },
          ],
          { cancelable: true },
        );
      } catch (error) {
        logger.warn("[useUpdateCheck] Error checking for update:", error);
      }
    };

    // Defer network fetch until after all startup interactions finish,
    // then add an extra delay so it doesn't compete with initial renders.
    // Running this eagerly on mount is a common cause of ANR on slow devices.
    const task = runAfterInteractions(() => {
      const timer = setTimeout(() => {
        checkForUpdate();
      }, 2000);
      return () => clearTimeout(timer);
    });
    return () => task.cancel();
  }, []); // runs exactly once on mount
};

export default useUpdateCheck;
