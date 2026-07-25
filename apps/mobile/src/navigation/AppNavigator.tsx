import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  Suspense,
  lazy,
} from "react";
import {
  InteractionManager,
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import LiquidGlassTabBar from "./LiquidGlassTabBar";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import * as Notifications from "expo-notifications";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
// screens
import HomeScreen from "../features/home/screens/HomeScreen";
import NewsScreen from "../features/news/screens/NewsScreen";
import GamesScreen from "../features/games/screens/GamesScreen";
import SettingsScreen from "../features/settings/screens/SettingsScreen";
import GameDetails from "../features/games/screens/GameDetailsScreen";
import UserGamesScreen from "../features/lists/screens/UserGamesScreen";
import NotificationSettings from "../features/settings/screens/NotificationScreen";
import Profile from "../features/settings/screens/ProfileScreen";
import AIChatScreen from "../features/ai/screens/AIChatScreen";
import GameNewsScreen from "../features/games/screens/GameNewsScreen";
import EventDetailsScreen from "../features/events/screens/EventDetailsScreen";
import type { GamingEvent } from "@/src/types/sharedTypes";
import UserListsScreen from "../features/lists/screens/UserListsScreen";
import NewsDetails from "../features/news/screens/NewsDetailsScreen";
import Loading from "../Loading";
const LanguageScreen = lazy(
  () => import("../features/settings/screens/LanguageSelectScreen"),
);
const ContactScreen = lazy(
  () => import("../features/settings/screens/ContactScreen"),
);
const LoginScreen = lazy(() => import("../features/auth/screens/LoginScreen"));
const RegisterScreen = lazy(
  () => import("../features/auth/screens/RegisterScreen"),
);
const ForgotPasswordScreen = lazy(
  () => import("../features/auth/screens/ForgotPasswordScreen"),
);

// Navigator Param Lists

export type HomeStackParamList = {
  HomeScreen: undefined;
  NewsDetails: { id: string } | undefined;
  AIChatScreen: undefined;
  EventDetailsScreen: { event: GamingEvent };
};

export type NewsStackParamList = {
  NewsScreen: undefined;
  NewsDetails: { id: string } | undefined;
};

export type GamesStackParamList = {
  GamesScreen: undefined;
  GameDetails: { id: string } | undefined;
  GameNewsScreen: undefined;
};

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  NotificationSettings: undefined;
  Profile: undefined;
  UserGamesScreen: undefined;
  LanguageScreen: undefined;
  GameDetails: { id: string } | undefined;
  ContactScreen: undefined;
  UserListsScreen: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  News: undefined;
  Games: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
  ForgotPassword: undefined;
};

// Icon Map Type

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type TabIconMap = Record<keyof MainTabParamList, [IoniconName, IoniconName]>;

// Static icon map
const TAB_ICON_MAP: TabIconMap = {
  Home: ["home", "home-outline"],
  News: ["newspaper", "newspaper-outline"],
  Games: ["game-controller", "game-controller-outline"],
  Settings: ["settings", "settings-outline"],
};

//  Navigators
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const NewsStackNav = createNativeStackNavigator<NewsStackParamList>();
const GamesStackNav = createNativeStackNavigator<GamesStackParamList>();
const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Shared Screen Options
const HIDDEN_HEADER_OPTIONS = {
  headerShown: false,
  animation: "slide_from_right",
} as const;
const settingsHeaderOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: "#fff" as const,
  headerTitleStyle: { fontWeight: "bold" as const },
  animation: "slide_from_right",
} as const;

// BannerAd wrapper
const AdBanner = memo(() => (
  <View style={styles.adContainer}>
    <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
  </View>
));
AdBanner.displayName = "AdBanner";

// Internal Stack Navigators

const HomeStack = memo(() => {
  const { t } = useTranslation();
  return (
    <HomeStackNav.Navigator id="HomeStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
      <HomeStackNav.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStackNav.Screen name="NewsDetails" component={NewsDetails} />
      <HomeStackNav.Screen
        name="AIChatScreen"
        component={AIChatScreen}
        options={{
          headerShown: true,
          title: t("aiChat.title"),
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#fff",
        }}
      />
      <HomeStackNav.Screen name="EventDetailsScreen" component={EventDetailsScreen} />
    </HomeStackNav.Navigator>
  );
});
HomeStack.displayName = "HomeStack";

const NewsStack = memo(() => (
  <NewsStackNav.Navigator id="NewsStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
    <NewsStackNav.Screen name="NewsScreen" component={NewsScreen} />
    <NewsStackNav.Screen name="NewsDetails" component={NewsDetails} />
  </NewsStackNav.Navigator>
));
NewsStack.displayName = "NewsStack";

const GamesStack = memo(() => {
  const { t } = useTranslation();
  const gameNewsOptions = useMemo(
    () => ({
      headerShown: true,
      title: t("games.list.gamesNews.title"),
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: "#fff" as const,
      headerTitleStyle: { fontWeight: "bold" as const },
    }),
    [t],
  );

  return (
    <GamesStackNav.Navigator id="GamesStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
      <GamesStackNav.Screen name="GamesScreen" component={GamesScreen} />
      <GamesStackNav.Screen name="GameDetails" component={GameDetails as any} />
      <GamesStackNav.Screen
        name="GameNewsScreen"
        component={GameNewsScreen as any}
        options={gameNewsOptions}
      />
    </GamesStackNav.Navigator>
  );
});
GamesStack.displayName = "GamesStack";

const SettingsStack = memo(() => {
  const { t } = useTranslation();
  const screenTitles = useMemo(
    () => ({
      notificationSettings: {
        title: t("navigation.titles.notificationSettings"),
      },
      profile: { title: t("navigation.titles.accountSettings") },
      userGames: { title: t("navigation.titles.gamesList") },
      language: { title: t("settings.menu.changeLanguage") },
      contact: { title: t("settings.contact.title") },
      userLists: { title: t("navigation.titles.myLists") },
    }),
    [t],
  );

  return (
    <SettingsStackNav.Navigator id="SettingsStack" screenOptions={settingsHeaderOptions}>
      <SettingsStackNav.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={HIDDEN_HEADER_OPTIONS}
      />
      <SettingsStackNav.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={screenTitles.notificationSettings}
      />
      <SettingsStackNav.Screen
        name="Profile"
        component={Profile}
        options={screenTitles.profile}
      />
      <SettingsStackNav.Screen
        name="UserGamesScreen"
        component={UserGamesScreen as any}
        options={({ navigation: nav, route }) => ({
          title:
            (route.params as { listName?: string } | undefined)?.listName ??
            screenTitles.userGames.title,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => nav.getParent()?.navigate("Games")}
              style={{ marginRight: 4, padding: 6 }}
            >
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />
      <SettingsStackNav.Screen
        name="LanguageScreen"
        component={LanguageScreen}
        options={screenTitles.language}
      />
      <SettingsStackNav.Screen
        name="GameDetails"
        component={GameDetails as any}
        options={HIDDEN_HEADER_OPTIONS}
      />
      <SettingsStackNav.Screen
        name="ContactScreen"
        component={ContactScreen}
        options={screenTitles.contact}
      />
      <SettingsStackNav.Screen
        name="UserListsScreen"
        component={UserListsScreen}
        options={screenTitles.userLists}
      />
    </SettingsStackNav.Navigator>
  );
});
SettingsStack.displayName = "SettingsStack";

// Main Tab Navigator
export const MainAppTabs = memo(() => {
  const { t } = useTranslation();
  const [showAds, setShowAds] = useState<boolean>(false);

  // Request notification permission once on mount, then defer ad rendering
  useEffect(() => {
    const requestPermission = async (): Promise<void> => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (__DEV__) {
        console.log(
          status === "granted"
            ? "[Notifications] Permission granted."
            : "[Notifications] Permission denied.",
        );
      }
    };

    requestPermission();

    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });

    return () => task.cancel();
  }, []);

  const screenOptions = useCallback(
    ({ route }: { route: { name: string } }): BottomTabNavigationOptions => {
      const routeName = route.name as keyof MainTabParamList;
      return {
        headerShown: false,
        tabBarStyle: { display: "none" },
        tabBarLabel: t(`navigation.tabs.${routeName.toLowerCase()}`),
        animation: "shift",
      };
    },
    [t],
  );

  return (
    <>
      <Tab.Navigator
        id="MainTabs"
        screenOptions={screenOptions}
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="News" component={NewsStack} />
        <Tab.Screen name="Games" component={GamesStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>

      {/* Lazy ad mount, only shown after interactions complete */}
      {showAds && <AdBanner />}
    </>
  );
});
MainAppTabs.displayName = "MainAppTabs";

// Auth Stack

export const AuthStack = memo(() => (
  <Suspense fallback={<Loading />}>
    <AuthStackNav.Navigator id="AuthStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStackNav.Navigator>
  </Suspense>
));
AuthStack.displayName = "AuthStack";

const styles = StyleSheet.create({
  adContainer: {
    alignItems: "center",
    width: "100%",
  },
});
