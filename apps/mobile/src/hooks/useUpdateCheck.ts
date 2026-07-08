import { useEffect } from "react";
import { Alert, Linking } from "react-native";
import { storage } from "../lib/storage";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

// Checks once per app version whether a newer build is on the Play Store.
// If one exists, shows a one-time dismissible Alert with an "Update Now" action.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone";

const PLAY_STORE_API_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone&hl=en&gl=US";

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

    // Primary pattern: ,"1.0.3"]
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const useUpdateCheck = (): void => {
  const { t } = useTranslation();

  useEffect(() => {
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
          t("common.updateAlert.title"),
          t("common.updateAlert.message"),
          [
            { text: t("common.updateAlert.later"), style: "cancel" },
            {
              text: t("common.updateAlert.updateNow"),
              onPress: () => Linking.openURL(PLAY_STORE_URL),
            },
          ],
          { cancelable: true },
        );
      } catch (error) {
        console.warn("[useUpdateCheck] Error checking for update:", error);
      }
    };

    checkForUpdate();
  }, []); // runs exactly once on mount
};

export default useUpdateCheck;
