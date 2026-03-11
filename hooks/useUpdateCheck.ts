import { useEffect } from "react";
import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

// Constants
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone" as const;
const PLAY_STORE_API_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone&hl=en&gl=US" as const;
const SHOWN_KEY_PREFIX = "update_alert_shown_v" as const;

// Parses a version string like "1.2.3" to an integer array [1, 2, 3] for comparison
const parseVersion = (version: string): number[] =>
  version.split(".").map((part) => parseInt(part, 10) || 0);

// Returns true if remoteVersion > localVersion
const isNewer = (remote: string, local: string): boolean => {
  const remoteParts = parseVersion(remote);
  const localParts = parseVersion(local);
  const maxLen = Math.max(remoteParts.length, localParts.length);
  for (let i = 0; i < maxLen; i++) {
    const r = remoteParts[i] ?? 0;
    const l = localParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
};

// Scrapes the latest version from the Play Store HTML page
const fetchLatestVersion = async (): Promise<string | null> => {
  try {
    const response = await fetch(PLAY_STORE_API_URL);
    const html = await response.text();

    // The version appears in a pattern like: ","1.0.3"]
    const match = html.match(/",\["(\d+\.\d+(?:\.\d+)*)"\]/);
    if (match?.[1]) return match[1];

    // Fallback pattern
    const fallback = html.match(/\[\[\["(\d+\.\d+(?:\.\d+)*)"\]\]/);
    if (fallback?.[1]) return fallback[1];

    return null;
  } catch {
    return null;
  }
};

// Checks once per app version whether a newer version is on the Play Store.
// If so, shows a one-time Alert giving the user the option to update or continue.
const useUpdateCheck = (): void => {
  const { t } = useTranslation();

  useEffect(() => {
    const checkForUpdate = async (): Promise<void> => {
      try {
        const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
        const storageKey = `${SHOWN_KEY_PREFIX}${currentVersion}`;

        // Already shown for this version — skip
        const alreadyShown = await AsyncStorage.getItem(storageKey);
        if (alreadyShown === "true") return;

        const latestVersion = await fetchLatestVersion();
        if (!latestVersion) return;

        if (!isNewer(latestVersion, currentVersion)) return;

        // Mark as shown before displaying — avoids double-shows on re-render
        await AsyncStorage.setItem(storageKey, "true");

        Alert.alert(
          t("common.updateAlert.title"),
          t("common.updateAlert.message"),
          [
            {
              text: t("common.updateAlert.later"),
              style: "cancel",
            },
            {
              text: t("common.updateAlert.updateNow"),
              onPress: () => Linking.openURL(PLAY_STORE_URL),
            },
          ],
          { cancelable: true }
        );
      } catch (error) {
        console.warn("[useUpdateCheck] Error checking for update:", error);
      }
    };

    checkForUpdate();
  }, []); // runs exactly once on mount
};

export default useUpdateCheck;
