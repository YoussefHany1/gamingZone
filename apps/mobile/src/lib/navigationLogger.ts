import React, { useEffect, useRef } from "react";
import type { NavigationContainerRef } from "@react-navigation/native";

// Fallback map for custom alias routes that don't match file names directly
const MANUAL_SCREEN_FILE_MAP: Record<string, string> = {
  MainApp: "src/navigation/AppNavigator.tsx",
  Auth: "src/navigation/AppNavigator.tsx",
  Home: "src/features/home/screens/HomeScreen.tsx",
  News: "src/features/news/screens/NewsScreen.tsx",
  Games: "src/features/games/screens/GamesScreen.tsx",
  Settings: "src/features/settings/screens/SettingsScreen.tsx",
  Social: "src/features/social/screens/SocialScreen.tsx",
  Profile: "src/features/settings/screens/ProfileScreen.tsx",
  EditProfile: "src/features/settings/screens/EditProfileScreen.tsx",
  UserProfile: "src/features/social/screens/UserProfileScreen.tsx",
  LanguageScreen: "src/features/settings/screens/LanguageSelectScreen.tsx",
  ThemeScreen: "src/features/settings/screens/ThemeScreen.tsx",
  ContactScreen: "src/features/settings/screens/ContactScreen.tsx",
  NotificationSettings: "src/features/settings/screens/NotificationScreen.tsx",
  Achievements: "src/features/gamification/screens/AchievementsScreen.tsx",
  GameDetails: "src/features/games/screens/GameDetailsScreen.tsx",
  NewsDetails: "src/features/news/screens/NewsDetailsScreen.tsx",
  Login: "src/features/auth/screens/LoginScreen.tsx",
  Register: "src/features/auth/screens/RegisterScreen.tsx",
  ForgotPassword: "src/features/auth/screens/ForgotPasswordScreen.tsx",
};

// Automatic discovery cache using Metro's require.context
let autoScreenMapCache: Record<string, string> | null = null;

/**
 * Automatically discovers all screen files in the project without manual registration
 */
function getAutoScreenMap(): Record<string, string> {
  if (autoScreenMapCache) return autoScreenMapCache;
  autoScreenMapCache = { ...MANUAL_SCREEN_FILE_MAP };

  try {
    const req = (require as any).context?.("../../src", true, /Screen\.tsx$/);
    if (req && typeof req.keys === "function") {
      for (const key of req.keys()) {
        const cleanPath = "src/" + key.replace(/^\.\//, "");
        const match = key.match(/\/([^/]+)\.tsx$/);
        if (match) {
          const screenName = match[1];
          autoScreenMapCache[screenName] = cleanPath;
          if (screenName.endsWith("Screen")) {
            const shortName = screenName.replace(/Screen$/, "");
            if (!autoScreenMapCache[shortName]) {
              autoScreenMapCache[shortName] = cleanPath;
            }
          }
        }
      }
    }
  } catch {
    // If require.context is not supported in the current environment, fallback to manual map
  }

  return autoScreenMapCache;
}

/**
 * Automatically extracts the caller file from the call stack
 * No need to pass 'file' prop manually!
 */
export function getCallerFile(): string | undefined {
  if (!__DEV__) return undefined;
  try {
    const stack = new Error().stack;
    if (!stack) return undefined;
    const lines = stack.split("\n");
    for (const line of lines) {
      if (
        line.includes("navigationLogger") ||
        line.includes("node_modules") ||
        line.includes("useModalLogger") ||
        line.includes("GameBottomSheet")
      ) {
        continue;
      }
      const match = line.match(/(src\/[A-Za-z0-9_\-\/]+(\.tsx|\.ts|\.js|\.jsx))/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Ignore error in stack parsing
  }
  return undefined;
}

let lastLoggedPath = "";
let lastLoggedParams = "";
let currentActiveScreen = "";
let currentActivePath = "";

/**
 * Traverses React Navigation state to extract the full hierarchy path
 * e.g. ["MainApp", "Social", "SocialScreen"]
 */
export function getNavigationPath(state: any): string[] {
  if (!state || !state.routes || state.routes.length === 0) return [];
  const index = typeof state.index === "number" ? state.index : state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return [];

  const path = [route.name];

  if (route.state) {
    path.push(...getNavigationPath(route.state));
  } else if (
    route.params &&
    typeof route.params === "object" &&
    typeof (route.params as any).screen === "string"
  ) {
    path.push((route.params as any).screen);
  }

  return path;
}

/**
 * Logs the current screen, its file path, and hierarchy path to console.log
 */
export function logScreenNavigation(
  navigationRef: React.RefObject<NavigationContainerRef<any> | null>,
): void {
  if (!__DEV__) return;
  if (!navigationRef.current) return;
  const currentRoute = navigationRef.current.getCurrentRoute();
  if (!currentRoute) return;

  const rootState = navigationRef.current.getRootState();
  const pathArray = getNavigationPath(rootState);
  const pathString = pathArray.length > 0 ? pathArray.join(" > ") : currentRoute.name;
  const paramsString =
    currentRoute.params && Object.keys(currentRoute.params).length > 0
      ? JSON.stringify(currentRoute.params)
      : "";

  if (pathString === lastLoggedPath && paramsString === lastLoggedParams) {
    return;
  }
  lastLoggedPath = pathString;
  lastLoggedParams = paramsString;
  currentActiveScreen = currentRoute.name;
  currentActivePath = pathString;

  const screenMap = getAutoScreenMap();
  const filePath = screenMap[currentRoute.name] ?? "Auto-discovery pending or custom screen";

  console.log(
    `📱 [Navigation] Screen: "${currentRoute.name}"\n` +
      `   File: ${filePath}\n` +
      `   Path: ${pathString}` +
      (paramsString ? `\n   Params: ${paramsString}` : ""),
  );
}

// Track active modals to avoid duplicate open/close events
const openModals = new Set<string>();

export type ModalLogInfo = {
  name: string;
  file?: string | undefined;
};

/**
 * Logs when a modal appears
 */
export function logModalOpen(info: ModalLogInfo): void {
  if (!__DEV__) return;
  const key = info.name;
  if (openModals.has(key)) return;
  openModals.add(key);

  const resolvedFile = info.file ?? getCallerFile();
  const screenMap = getAutoScreenMap();
  const screenFile = currentActiveScreen
    ? screenMap[currentActiveScreen] ?? "Unknown file"
    : "";

  console.log(
    `🪟 [Modal Opened] "${info.name}"\n` +
      (resolvedFile ? `   File: ${resolvedFile}\n` : "") +
      (currentActiveScreen
        ? `   On Screen: ${currentActiveScreen} (${currentActivePath})\n` +
          `   Screen File: ${screenFile}`
        : ""),
  );
}

/**
 * Logs when a modal closes
 */
export function logModalClose(info: ModalLogInfo): void {
  if (!__DEV__) return;
  const key = info.name;
  if (!openModals.has(key)) return;
  openModals.delete(key);

  const resolvedFile = info.file ?? getCallerFile();

  console.log(
    `🪟 [Modal Closed] "${info.name}"` +
      (resolvedFile ? `\n   File: ${resolvedFile}` : ""),
  );
}

/**
 * React hook to automatically log modal open/close transitions.
 * Automatically resolves the caller file if 'file' is not provided.
 */
export function useModalLogger(
  name: string,
  visible: boolean,
  file?: string | undefined,
): void {
  const isFirstRender = useRef(true);
  const detectedFile = useRef<string | undefined>(file ?? getCallerFile());

  useEffect(() => {
    if (!__DEV__) return;

    const modalFile = file ?? detectedFile.current;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (visible) {
        logModalOpen({ name, file: modalFile });
      }
      return;
    }

    if (visible) {
      logModalOpen({ name, file: modalFile });
    } else {
      logModalClose({ name, file: modalFile });
    }
  }, [name, visible, file]);
}
