import React, { Suspense, useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import auth from "@react-native-firebase/auth";
import analytics from "@react-native-firebase/analytics";
import * as SplashScreen from "expo-splash-screen";
import "./i18n";
import COLORS from "./constants/colors";
import Loading from "./Loading";
import useNotifications from "./hooks/useNotifications";
import useRateApp from "./hooks/useRateApp";
import { MainAppTabs, AuthStack } from "./navigation/AppNavigator";
import * as Linking from "expo-linking";

// Global config
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

const Stack = createNativeStackNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      retry: 2,
    },
  },
});
// منع الإخفاء التلقائي حتى يصبح التطبيق جاهزاً
SplashScreen.preventAutoHideAsync();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const routeNameRef = useRef();
  const navigationRef = useRef();

  // 1. Auth State Management
  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(async (newUser) => {
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
      if (newUser) {
        await analytics().setUserId(newUser.uid);
        await analytics().setUserProperty(
          "email_verified",
          String(newUser.emailVerified),
        );
        await analytics().setUserProperty(
          "is_anonymous",
          String(newUser.isAnonymous),
        );
      } else {
        await analytics().setUserId(null);
      }
      setLoading(false);
    });

    if (!loading) {
      SplashScreen.hideAsync();
    }

    return () => unsubscribeAuth();
  }, [loading]);

  useNotifications(user);
  useRateApp();

  if (loading) {
    return <Loading />;
  }

  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: COLORS.primary,
    },
  };
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
                NewsDetails: "news-details", // هذا هو المسار في الرابط
              },
            },
          },
        },
      },
    },
  };
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: COLORS.primary }}>
          <StatusBar style="light" translucent={true} />

          <NavigationContainer
            ref={navigationRef}
            theme={MyTheme}
            linking={linking}
            onReady={() => {
              routeNameRef.current =
                navigationRef.current.getCurrentRoute().name;
            }}
            onStateChange={async () => {
              const previousRouteName = routeNameRef.current;
              const currentRouteName =
                navigationRef.current.getCurrentRoute().name;

              if (previousRouteName !== currentRouteName) {
                await analytics().logScreenView({
                  screen_name: currentRouteName,
                  screen_class: currentRouteName,
                });
              }
              routeNameRef.current = currentRouteName;
            }}
          >
            <Suspense fallback={<Loading />}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {/* جعلنا MainApp في البداية لتظهر دائماً عند الفتح */}
                <Stack.Screen name="MainApp" component={MainAppTabs} />

                {/* أبقينا على Auth لتتمكن من الانتقال إليها يدوياً لاحقاً (مثلاً من الإعدادات) */}
                <Stack.Screen name="Auth" component={AuthStack} />
              </Stack.Navigator>
            </Suspense>
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
