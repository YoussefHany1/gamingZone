import React, {
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useAuthStore } from "./store/useAuthStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NavigationContainer,
  DefaultTheme,
  NavigationContainerRef,
  Theme,
  getStateFromPath,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import analytics from "@react-native-firebase/analytics";
import * as SplashScreen from "expo-splash-screen";
import * as Localization from "expo-localization";
import * as Updates from "expo-updates";
import { I18nManager } from "react-native";
import i18n from "./i18n";
import COLORS from "./constants/colors";
import Loading from "./Loading";
import useNotifications from "./hooks/useNotifications";
import useRateApp from "./hooks/useRateApp";
import useUpdateCheck from "./hooks/useUpdateCheck";
const MainAppTabs = React.lazy(() =>
  import("./navigation/AppNavigator").then((m) => ({ default: m.MainAppTabs })),
);
const AuthStack = React.lazy(() =>
  import("./navigation/AppNavigator").then((m) => ({ default: m.AuthStack })),
);
import OnboardingScreen from "./screens/OnboardingScreen";

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
const linking = {
  prefixes: [
    "gaming-zone://",
    "https://gz1.vercel.app/",
    "http://gz1.vercel.app/",
    "https://igdb-api-omega.vercel.app/",
    "http://igdb-api-omega.vercel.app/",
  ],
  config: {
    screens: {
      MainApp: {
        screens: {
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
  getStateFromPath(path: string, options: any) {
    let cleanPath = path;

    // 1. Remove leading slash
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    // 2. Strip locale prefixes like en/ or ar/ if present
    if (cleanPath.startsWith("en/")) {
      cleanPath = cleanPath.substring(3);
    } else if (cleanPath.startsWith("ar/")) {
      cleanPath = cleanPath.substring(3);
    }

    // 3. Handle "/lists" deep links
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
      } as any);

      if (state) {
        try {
          const route = state.routes[0];
          if (route && route.state && route.state.routes) {
            const settingsRoute = route.state.routes.find(
              (r) => r.name === "Settings",
            );
            if (
              settingsRoute &&
              settingsRoute.state &&
              settingsRoute.state.routes
            ) {
              const userGamesRoute = settingsRoute.state.routes.find(
                (r) => r.name === "UserGamesScreen",
              );
              if (userGamesRoute && userGamesRoute.params) {
                const params = userGamesRoute.params as any;
                if (params.name && !params.listName) {
                  params.listName = params.name;
                }
              }
            }
          }
        } catch (e) {
          console.error("Error mapping query params for lists deep link:", e);
        }
      }
      return state;
    }

    // 4. Handle old/fallback "/news-details" path with query params
    if (cleanPath.startsWith("news-details")) {
      return getStateFromPath(cleanPath, {
        screens: {
          MainApp: {
            screens: {
              News: {
                screens: {
                  NewsDetails: "news-details",
                },
              },
            },
          },
        },
      } as any);
    }

    // 5. Default parsing for modern "news/:id"
    return getStateFromPath(cleanPath, options);
  },
};

// Splash Guard
SplashScreen.preventAutoHideAsync();

function App(): React.ReactElement | null {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.isLoading);
  const initAuth = useAuthStore((state) => state.initAuth);

  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const routeNameRef = useRef<string | undefined>(undefined);
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Auth State — all listener / AppState / analytics logic lives in the store
  useEffect(() => {
    const cleanup = initAuth();
    return cleanup;
  }, [initAuth]);

  // Onboarding & Language check — runs once auth has resolved
  useEffect(() => {
    if (loading) return;
    (async () => {
      // 1. Check/Set Device Language on First Launch
      const langSet = await AsyncStorage.getItem("@language_set");
      if (!langSet) {
        const locales = Localization.getLocales();
        const sysLang = locales[0]?.languageCode === "ar" ? "ar" : "en";

        await AsyncStorage.setItem("@language_set", "true");

        if (sysLang === "ar" && !I18nManager.isRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
          await i18n.changeLanguage("ar");
          try {
            await Updates.reloadAsync();
          } catch (e) {
            console.warn("Failed to reload", e);
          }
          return; // Stop execution as the app will reload
        } else if (sysLang === "en" && I18nManager.isRTL) {
          I18nManager.allowRTL(false);
          I18nManager.forceRTL(false);
          await i18n.changeLanguage("en");
          try {
            await Updates.reloadAsync();
          } catch (e) {
            console.warn("Failed to reload", e);
          }
          return;
        } else {
          await i18n.changeLanguage(sysLang);
        }
      }

      // 2. Check Onboarding
      const seen = await AsyncStorage.getItem("@onboarding_done");
      if (!seen) {
        setShowOnboarding(true);
      }
    })();
  }, [loading]);

  // Splash Hide
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // Hooks
  useNotifications(user);
  useRateApp();
  useUpdateCheck();

  // Navigation Analytics
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

  if (loading) {
    return <Loading />;
  }

  if (showOnboarding) {
    const handleOnboardingDone = async () => {
      await AsyncStorage.setItem("@onboarding_done", "true");
      setShowOnboarding(false);
    };
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <StatusBar style="light" />
          <OnboardingScreen onDone={handleOnboardingDone} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
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
            <Suspense fallback={<Loading />}>
              <Stack.Navigator
                id="root"
                screenOptions={{ headerShown: false, freezeOnBlur: true }}
              >
                <Stack.Screen name="MainApp" component={MainAppTabs} />
                <Stack.Screen name="Auth" component={AuthStack} />
              </Stack.Navigator>
            </Suspense>
          </NavigationContainer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
});

export default App;
