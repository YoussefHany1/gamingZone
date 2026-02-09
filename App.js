import React, { Suspense, useEffect, useState, useRef } from "react";
import { View, AppState } from "react-native";
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
import { MainAppTabs, AuthStack } from "./navigation/AppNavigator";

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

SplashScreen.preventAutoHideAsync();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const routeNameRef = useRef();
  const navigationRef = useRef();
  const appState = useRef(AppState.currentState); // track the app state

  // 1. Auth State Management
  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(async (newUser) => {
      setUser(newUser);
      if (newUser) {
        await analytics().setUserId(newUser.uid);
        await analytics().setUserProperty(
          "email_verified",
          String(newUser.emailVerified),
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

  // 2. **الحل الجديد**: AppState Listener
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // التطبيق رجع من الخلفية للأمام
        console.log("App has come to the foreground!");

        // إعادة تحميل حالة المستخدم
        const currentUser = auth().currentUser;
        if (currentUser) {
          setUser({ ...currentUser }); // Force re-render
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // 3. Notifications Logic
  useNotifications(user);

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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: COLORS.primary }}>
          <StatusBar style="light" translucent={true} />

          <NavigationContainer
            ref={navigationRef}
            theme={MyTheme}
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
              <Stack.Navigator
                key={user ? user.uid : "guest"}
                screenOptions={{ headerShown: false }}
              >
                {user ? (
                  <>
                    <Stack.Screen name="MainApp" component={MainAppTabs} />
                  </>
                ) : (
                  <Stack.Screen name="Auth" component={AuthStack} />
                )}
              </Stack.Navigator>
            </Suspense>
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
