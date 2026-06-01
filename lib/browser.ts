import { Alert, Linking } from "react-native";
import COLORS from "../constants/colors";

/**
 * Opens a URL in an in-app browser with customized aesthetics matching the app theme.
 * If the in-app browser native module is not available or crashes, it gracefully falls back to opening in the system's default browser.
 * 
 * @param url The link to open
 */
export async function openLink(url: string): Promise<void> {
  if (!url) return;

  // Trim URL to prevent spaces from causing failures
  const targetUrl = url.trim();

  // Validate URL protocol
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    // If it's a deep link or custom scheme, open with Linking
    try {
      await Linking.openURL(targetUrl);
      return;
    } catch (err) {
      Alert.alert("Error", "Could not open link");
      return;
    }
  }

  // Attempt to load and use expo-web-browser dynamically to avoid load-time crashes
  try {
    const WebBrowser = require("expo-web-browser");
    if (WebBrowser && typeof WebBrowser.openBrowserAsync === "function") {
      await WebBrowser.openBrowserAsync(targetUrl, {
        toolbarColor: COLORS.darkBackground,
        secondaryToolbarColor: COLORS.darkBackground,
        controlsColor: "#ffffff",
        enableBarCollapsing: true,
        showTitle: true,
        enableDefaultShareMenuItem: true,
        createTask: false, // Prevents creating a new task stack on Android
      });
      return;
    }
  } catch (error) {
    console.warn("[Browser] ExpoWebBrowser native module is missing or failed to load. Falling back to Linking.openURL.", error);
  }

  // Fallback to standard external browser if in-app browser fails/is missing
  try {
    await Linking.openURL(targetUrl);
  } catch (err) {
    Alert.alert("Error", "Could not open link");
  }
}
