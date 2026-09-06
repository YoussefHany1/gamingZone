import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { useShallow } from "zustand/react/shallow";
import { storage } from "./lib/storage";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NavigationContainer,
  DefaultTheme,
  NavigationContainerRef,
  Theme,
  getStateFromPath,
  LinkingOptions,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import analytics from "@react-native-firebase/analytics";
import * as SplashScreen from "expo-splash-screen";
import * as Localization from "expo-localization";
import * as Updates from "expo-updates";
import { useFonts } from "expo-font";
import { APP_FONTS } from "./utils/fontUtils";
import { I18nManager } from "react-native";
import i18n from "./i18n";
import COLORS from "./constants/colors";
import Loading from "./Loading";
import UpdateScreen from "./components/UpdateScreen";
import useNotifications from "./hooks/useNotifications";
import useRateApp from "./hooks/useRateApp";
import useUpdateCheck from "./hooks/useUpdateCheck";
import useOTAUpdate from "./hooks/useOTAUpdate";
import { MainAppTabs, AuthStack } from "./navigation/AppNavigator";
import OnboardingScreen from "./features/onboarding/screens/OnboardingScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Types
export type RootStackParamList = {
  MainApp: undefined;
  Auth: undefined;
};

// Global Config
declare const globalThis: {
  RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
};
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

// QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
    },
  },
});

// Theme
const MyTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.primary,
  },
};

// Deep Linking Config
const linking: LinkingOptions<any> = {
  prefixes: ["gaming-zone://", "https://gz1.vercel.app", "http://gz1.vercel.app"],
  config: {
    screens: {
      MainApp: {
        screens: {
          // All news deep links open in the News tab
          News: {
            screens: {
              NewsDetails: "news/:id",
            },
          },
          Settings: {
            screens: {
              UserGamesScreen: "lists/:listId",
            },
          },
        },
      },
    },
  },
  getStateFromPath(path: string, options: Parameters<typeof getStateFromPath>[1]) {
    let cleanPath = path.startsWith("/") ? path.substring(1) : path;

    // Strip locale prefix (e.g. /en/news/123 or /ar/lists/456)
    if (cleanPath.startsWith("en/")) cleanPath = cleanPath.substring(3);
    else if (cleanPath.startsWith("ar/")) cleanPath = cleanPath.substring(3);

    // lists/:listId → Settings > UserGamesScreen
    if (cleanPath.startsWith("lists/")) {
      const state = getStateFromPath(cleanPath, {
        screens: {
          MainApp: {
            screens: {
              Settings: {
                screens: {
                  UserGamesScreen: "lists/:listId",
                },
              },
            },
          },
        },
      } as Parameters<typeof getStateFromPath>[1]);

      // Map query param "name" → "listName" (what UserGamesScreen expects)
      if (state) {
        try {
          // Recursively find the UserGamesScreen route anywhere in the state tree
          const findRoute = (routes: any[]): any => {
            for (const r of routes) {
              if (r.name === "UserGamesScreen") return r;
              if (r.state?.routes) {
                const found = findRoute(r.state.routes);
                if (found) return found;
              }
            }
            return null;
          };
          const userGamesRoute = findRoute(state.routes);
          if (userGamesRoute?.params) {
            const params = userGamesRoute.params as Record<string, unknown>;
            // "name" query param → "listName" (required by UserGamesScreen)
            if (params.name && !params.listName) {
              params.listName = params.name;
            }
          }
        } catch (e) {
          if (__DEV__) console.warn("[DeepLink] lists param mapping error:", e);
        }
      }
      return state;
    }

    // news/:id — let the default config resolve it
    return getStateFromPath(cleanPath, options);
  },
};

SplashScreen.preventAutoHideAsync();

function App(): React.ReactElement | null {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);

  const { user, loading, initAuth } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      loading: state.isLoading,
      initAuth: state.initAuth,
    })),
  );

  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const routeNameRef = useRef<string | undefined>(undefined);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    const cleanup = initAuth();
    return cleanup;
  }, [initAuth]);

  useEffect(() => {
    if (loading) return;
    (async () => {
      // MMKV reads are synchronous — no await needed
      const langSet = storage.getString("@language_set");
      if (!langSet) {
        const locales = Localization.getLocales();
        const sysLang = locales[0]?.languageCode === "ar" ? "ar" : "en";

        storage.set("@language_set", "true");

        if (sysLang === "ar" && !I18nManager.isRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
          await i18n.changeLanguage("ar");
          // Defer reload to avoid ANR on slow devices — give the main thread
          // time to finish its current frame before triggering a full JS reload.
          setTimeout(async () => {
            try {
              await Updates.reloadAsync();
            } catch (e) {
              console.warn("Failed to reload", e);
            }
          }, 300);
          return;
        } else if (sysLang === "en" && I18nManager.isRTL) {
          I18nManager.allowRTL(false);
          I18nManager.forceRTL(false);
          await i18n.changeLanguage("en");
          setTimeout(async () => {
            try {
              await Updates.reloadAsync();
            } catch (e) {
              console.warn("Failed to reload", e);
            }
          }, 300);
          return;
        } else {
          await i18n.changeLanguage(sysLang);
        }
      }

      const seen = storage.getString("@onboarding_done");
      if (!seen) {
        setShowOnboarding(true);
      }
    })();
  }, [loading]);

  useEffect(() => {
    if (!loading && (fontsLoaded || fontError)) {
      // Wrap in try/catch to handle the Android NullPointerException
      // that occurs when SurfaceControl is released before hideAsync completes.
      // Adding a small delay ensures the Activity's drawing phase is fully ready.
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch((e) => {
          if (__DEV__) console.warn("[SplashScreen] hideAsync failed:", e);
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading, fontsLoaded, fontError]);

  useNotifications(user);
  useRateApp();
  useUpdateCheck();

  const otaState = useOTAUpdate();

  const handleNavigationReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  }, []);

  const handleStateChange = useCallback(async () => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName && currentRouteName) {
      await analytics().logScreenView({
        screen_name: currentRouteName,
        screen_class: currentRouteName,
      });
    }
    routeNameRef.current = currentRouteName;
  }, []);

  const handleOnboardingDone = useCallback(async () => {
    storage.set("@onboarding_done", "true");
    setShowOnboarding(false);
  }, []);

  // Show OTA update progress screen while downloading an EAS update
  if (
    otaState.status === "checking" ||
    otaState.status === "downloading" ||
    otaState.status === "ready"
  ) {
    const progress =
      otaState.status === "downloading"
        ? otaState.progress
        : otaState.status === "ready"
          ? 1
          : 0;
    return <UpdateScreen progress={progress} />;
  }

  if (loading || (!fontsLoaded && !fontError)) {
    return <Loading />;
  }

  if (showOnboarding) {
    return (
      <ErrorBoundary sectionLabel="Onboarding">
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" />
            <OnboardingScreen onDone={handleOnboardingDone} />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary sectionLabel="Root">
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" />

            <NavigationContainer
              ref={navigationRef}
              theme={MyTheme}
              linking={linking}
              onReady={handleNavigationReady}
              onStateChange={handleStateChange}
            >
              {/* التعديل: إزالة الـ Suspense المحيط بـ الـ Navigator لعدم الحاجة إليه الآن */}
              <Stack.Navigator
                id="root"
                screenOptions={{ headerShown: false, freezeOnBlur: true }}
              >
                <Stack.Screen name="MainApp" component={MainAppTabs} />
                <Stack.Screen name="Auth" component={AuthStack} />
              </Stack.Navigator>
            </NavigationContainer>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
});

export default App;
