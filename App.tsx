import React, {
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StyleSheet, AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NavigationContainer,
  DefaultTheme,
  NavigationContainerRef,
  Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import analytics from "@react-native-firebase/analytics";
import * as SplashScreen from "expo-splash-screen";
import "./i18n";
import COLORS from "./constants/colors";
import Loading from "./Loading";
import useNotifications from "./hooks/useNotifications";
import useRateApp from "./hooks/useRateApp";
import useUpdateCheck from "./hooks/useUpdateCheck";
import { MainAppTabs, AuthStack } from "./navigation/AppNavigator";
import OnboardingScreen from "./screens/OnboardingScreen";

// Types
export type RootStackParamList = {
  MainApp: undefined;
  Auth: undefined;
};

// Global Config
declare const globalThis: { RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean };
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
    "https://igdb-api-omega.vercel.app/",
    "http://igdb-api-omega.vercel.app/",
  ],
  config: {
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
  },
};

// Splash Guard
SplashScreen.preventAutoHideAsync();

function App(): React.ReactElement | null {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const routeNameRef = useRef<string | undefined>(undefined);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Auth State
  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(
      async (newUser: FirebaseAuthTypes.User | null) => {
        if (!newUser) {
          try {
            await auth().signInAnonymously();
            return;
          } catch (error) {
            console.error("Error signing in anonymously:", error);
            setLoading(false);
            return;
          }
        }

        setUser(newUser);

        // User tracking
        await analytics().setUserId(newUser.uid);
        await analytics().setUserProperty(
          "email_verified",
          String(newUser.emailVerified)
        );
        await analytics().setUserProperty(
          "is_anonymous",
          String(newUser.isAnonymous)
        );

        setLoading(false);
      }
    );

    // Guard against blank screen after long background / screen lock.
    // When the OS suspends the JS thread for a long time and then resumes,
    // React state resets but Firebase's native layer still knows the current user.
    // If we're still in "loading" state when coming to foreground, give the auth
    // listener 2s to fire naturally — if it doesn't, read currentUser directly
    // from the native module and clear loading ourselves.
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      const prev = appState.current;
      appState.current = nextState;

      const comingToForeground =
        (prev === "background" || prev === "inactive") &&
        nextState === "active";

      if (!comingToForeground) return;

      // Give the auth listener 2s to fire on its own first
      resumeTimer = setTimeout(() => {
        setLoading((wasLoading) => {
          if (!wasLoading) return false; // already resolved, nothing to do
          // Auth listener didn't fire in time — read from native layer directly
          const currentUser = auth().currentUser;
          setUser(currentUser);
          return false; // clear loading
        });
      }, 2000);
    };

    const appStateSub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      unsubscribeAuth();
      appStateSub.remove();
      if (resumeTimer) clearTimeout(resumeTimer);
    };
  }, []);

  // Onboarding check — runs once auth has resolved
  useEffect(() => {
    if (loading) return;
    (async () => {
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
          <StatusBar style="light" translucent={true} />
          <OnboardingScreen onDone={handleOnboardingDone} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <StatusBar style="light" translucent={true} />

          <NavigationContainer
            ref={navigationRef}
            theme={MyTheme}
            linking={linking}
            onReady={handleNavigationReady}
            onStateChange={handleStateChange}
          >
            <Suspense fallback={<Loading />}>
              <Stack.Navigator id="root" screenOptions={{ headerShown: false }}>
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