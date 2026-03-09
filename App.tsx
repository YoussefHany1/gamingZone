import React, {
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { View, StyleSheet } from "react-native";
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
import { MainAppTabs, AuthStack } from "./navigation/AppNavigator";

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

  const routeNameRef = useRef<string | undefined>(undefined);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

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

    return () => unsubscribeAuth();
  }, []);

  // Splash Hide
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // Hooks
  useNotifications(user);
  useRateApp();

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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={styles.container}>
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
        </View>
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