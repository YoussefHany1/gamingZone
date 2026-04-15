import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  Suspense,
  lazy,
} from "react";
import { InteractionManager, View, StyleSheet, TouchableOpacity } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import * as Notifications from "expo-notifications";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
// screens
import HomeScreen from "../screens/HomeScreen";
import NewsScreen from "../screens/NewsScreen";
import GamesScreen from "../screens/GamesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import GameDetails from "../screens/GameDetailsScreen";
import UserGamesScreen from "../screens/UserGamesScreen";
import NotificationSettings from "../components/Notification";
import Profile from "../screens/ProfileScreen";
import AIChatScreen from "../screens/AIChatScreen";
import GameNewsScreen from "../screens/GameNewsScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import type { GamingEvent } from "../components/types";
import UserListsScreen from "../screens/UserListsScreen";
import NewsDetails from "../screens/NewsDetailsScreen";
import Loading from "../Loading";
const LanguageScreen = lazy(() => import("../screens/LanguageSelect"));
const ContactScreen = lazy(() => import("../screens/ContactScreen"));
const LoginScreen = lazy(() => import("../screens/LoginScreen"));
const RegisterScreen = lazy(() => import("../screens/RegisterScreen"));
const ForgotPasswordScreen = lazy(
  () => import("../screens/ForgotPasswordScreen")
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
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Shared Screen Options
const HIDDEN_HEADER_OPTIONS = { headerShown: false, detachInactiveScreens: false, animation: 'fade_from_bottom' } as const;
const settingsHeaderOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: "#fff" as const,
  headerTitleStyle: { fontWeight: "bold" as const },
  detachInactiveScreens: false,
  animation: 'fade_from_bottom'
} as const;

// BannerAd wrapper
const AdBanner = memo(() => (
  <View style={styles.adContainer}>
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    />
  </View>
));
AdBanner.displayName = "AdBanner";

// Internal Stack Navigators

const HomeStack = memo(() => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator id="HomeStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="NewsDetails" component={NewsDetails} />
      <Stack.Screen
        name="AIChatScreen"
        component={AIChatScreen}
        options={{
          headerShown: true,
          title: t("aiChat.title"),
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#fff"
        }}
      />
      <Stack.Screen name="EventDetailsScreen" component={EventDetailsScreen} />
    </Stack.Navigator>
  );
});
HomeStack.displayName = "HomeStack";

const NewsStack = memo(() => (
  <Stack.Navigator id="NewsStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
    <Stack.Screen name="NewsScreen" component={NewsScreen} />
    <Stack.Screen name="NewsDetails" component={NewsDetails} />
  </Stack.Navigator>
));
NewsStack.displayName = "NewsStack";

const GamesStack = memo(() => {
  const { t } = useTranslation();
  const gameNewsOptions = useMemo(
    () => ({
      headerShown: true,
      title: t("games.list.gamesNews"),
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: "#fff" as const,
      headerTitleStyle: { fontWeight: "bold" as const },
    }),
    [t]
  );

  return (
    <Stack.Navigator id="GamesStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
      <Stack.Screen name="GamesScreen" component={GamesScreen} />
      <Stack.Screen name="GameDetails" component={GameDetails} />
      <Stack.Screen
        name="GameNewsScreen"
        component={GameNewsScreen}
        options={gameNewsOptions}
      />
    </Stack.Navigator>
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
    [t]
  );

  return (
    <Stack.Navigator id="SettingsStack" screenOptions={settingsHeaderOptions}>
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={HIDDEN_HEADER_OPTIONS}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={screenTitles.notificationSettings}
      />
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={screenTitles.profile}
      />
      <Stack.Screen
        name="UserGamesScreen"
        component={UserGamesScreen}
        options={({ navigation: nav, route }) => ({
          title: (route.params as { listName?: string } | undefined)?.listName ?? screenTitles.userGames.title,
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
      <Stack.Screen
        name="LanguageScreen"
        component={LanguageScreen}
        options={screenTitles.language}
      />
      <Stack.Screen
        name="GameDetails"
        component={GameDetails}
        options={HIDDEN_HEADER_OPTIONS}
      />
      <Stack.Screen
        name="ContactScreen"
        component={ContactScreen}
        options={screenTitles.contact}
      />
      <Stack.Screen
        name="UserListsScreen"
        component={UserListsScreen}
        options={screenTitles.userLists}
      />
    </Stack.Navigator>
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
            : "[Notifications] Permission denied."
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
      const [focusedIcon, unfocusedIcon] = TAB_ICON_MAP[routeName];

      return {
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.lightGray,
        tabBarInactiveTintColor: COLORS.lightGray,

        tabBarLabel: t(`navigation.tabs.${routeName.toLowerCase()}`),
        tabBarIcon: ({
          focused,
          color,
          size,
        }: {
          focused: boolean;
          color: string;
          size: number;
        }) => (
          <Ionicons
            name={focused ? focusedIcon : unfocusedIcon}
            size={size}
            color={color}
          />
        ),
      };
    },
    [t]
  );

  return (
    <>
      <Tab.Navigator id="MainTabs" screenOptions={screenOptions}>
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
    <Stack.Navigator id="AuthStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  </Suspense>
));
AuthStack.displayName = "AuthStack";


const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.darkBackground,
    borderWidth: 0,
    borderTopWidth: 0,
    paddingTop: 5,
    alignItems: "center",
  },
  adContainer: {
    alignItems: "center",
    width: "100%",
  },
});