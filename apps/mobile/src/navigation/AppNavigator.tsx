import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import CustomText from "@/src/components/CustomText";
import LiquidGlassTabBar from "./LiquidGlassTabBar";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import {
  getFocusedRouteNameFromRoute,
  useNavigationState,
} from "@react-navigation/native";
import { Freeze } from "react-freeze";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import type {
  MaterialTopTabNavigationOptions,
  MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { CirclePlus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import * as Notifications from "expo-notifications";
import { useThemeColors } from "@/src/hooks/useTheme";
import { adUnitId } from "../constants/config";
import HomeScreen from "../features/home/screens/HomeScreen";
import NewsScreen from "../features/news/screens/NewsScreen";
import GamesScreen from "../features/games/screens/GamesScreen";
import SettingsScreen from "../features/settings/screens/SettingsScreen";
import GameDetails from "../features/games/screens/GameDetailsScreen";
import UserGamesScreen from "../features/lists/screens/UserGamesScreen";
import NotificationSettings from "../features/settings/screens/NotificationScreen";
import Profile from "../features/settings/screens/ProfileScreen";
import EditProfileScreen from "../features/settings/screens/EditProfileScreen";
import AIChatScreen from "../features/ai/screens/AIChatScreen";
import GameNewsScreen from "../features/games/screens/GameNewsScreen";
import EventDetailsScreen from "../features/events/screens/EventDetailsScreen";
import type { GamingEvent } from "@/src/types/sharedTypes";
import UserListsScreen from "../features/lists/screens/UserListsScreen";
import NewsDetails from "../features/news/screens/NewsDetailsScreen";
import LanguageScreen from "../features/settings/screens/LanguageSelectScreen";
import ThemeScreen from "../features/settings/screens/ThemeScreen";
import ContactScreen from "../features/settings/screens/ContactScreen";
import LoginScreen from "../features/auth/screens/LoginScreen";
import RegisterScreen from "../features/auth/screens/RegisterScreen";
import ForgotPasswordScreen from "../features/auth/screens/ForgotPasswordScreen";

// Navigator Param Lists

export type HomeStackParamList = {
  HomeScreen: undefined;
  NewsDetails: { id: string } | undefined;
  AIChatScreen: undefined;
  EventDetailsScreen: { event: GamingEvent };
  GameDetails: { gameID: number | string; claimUrl?: string; store?: string } | undefined;
};

export type NewsStackParamList = {
  NewsScreen: undefined;
  NewsDetails: { id: string } | undefined;
};

export type GamesStackParamList = {
  GamesScreen: undefined;
  GameDetails: { gameID: number | string; claimUrl?: string; store?: string } | undefined;
  GameNewsScreen: undefined;
};

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  NotificationSettings: undefined;
  Profile: undefined;
  EditProfile: undefined;
  UserGamesScreen: { listId: string; listName: string; ownerId?: string } | undefined;
  LanguageScreen: undefined;
  ThemeScreen: undefined;
  GameDetails: { gameID: number | string; claimUrl?: string; store?: string } | undefined;
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

//  Navigators
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const NewsStackNav = createNativeStackNavigator<NewsStackParamList>();
const GamesStackNav = createNativeStackNavigator<GamesStackParamList>();
const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();

// Shared Screen Options
const HIDDEN_HEADER_OPTIONS = {
  headerShown: false,
  animation: "slide_from_right",
  // Screens covered by the one on top stop re-rendering (react-freeze), so a
  // theme change repaints only what the user can actually see.
  freezeOnBlur: true,
} as const;

function useSettingsHeaderOptions(): NativeStackNavigationOptions {
  const colors = useThemeColors();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitle: ({ children }: any) => (
        <CustomText style={{ fontSize: 18, fontWeight: "bold", color: colors.text }}>
          {children}
        </CustomText>
      ),
      animation: "slide_from_right",
      freezeOnBlur: true,
    }),
    [colors],
  );
}

// BannerAd wrapper
const AdBanner = memo(() => {
  const adsEnabled = useAdsEnabled();
  if (!adsEnabled) return null;
  return (
    <View style={styles.adContainer}>
      <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
});
AdBanner.displayName = "AdBanner";

// Internal Stack Navigators

const HomeStack = memo(() => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const aiChatOptions = useMemo(
    () => ({
      headerShown: true,
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitle: () => (
        <CustomText style={{ fontSize: 18, fontWeight: "bold", color: colors.text }}>
          {t("aiChat.title")}
        </CustomText>
      ),
    }),
    [t, colors],
  );
  return (
    <HomeStackNav.Navigator id="HomeStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
      <HomeStackNav.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStackNav.Screen name="NewsDetails" component={NewsDetails} />
      <HomeStackNav.Screen name="GameDetails" component={GameDetails as any} />
      <HomeStackNav.Screen
        name="AIChatScreen"
        component={AIChatScreen}
        options={aiChatOptions}
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
  const colors = useThemeColors();
  const gameNewsOptions = useMemo(
    () => ({
      headerShown: true,
      title: t("games.list.gamesNews.title"),
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitle: () => (
        <CustomText style={{ fontSize: 18, fontWeight: "bold", color: colors.text }}>
          {t("games.list.gamesNews.title")}
        </CustomText>
      ),
    }),
    [t, colors],
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
  const settingsHeaderOptions = useSettingsHeaderOptions();
  const colors = useThemeColors();
  const screenTitles = useMemo(
    () => ({
      notificationSettings: {
        title: t("navigation.titles.notificationSettings"),
      },
      profile: { title: t("navigation.titles.profile") },
      editProfile: { title: t("navigation.titles.accountSettings") },
      userGames: { title: t("navigation.titles.gamesList") },
      language: { title: t("settings.menu.changeLanguage") },
      theme: { title: t("settings.theme.title") },
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
        name="EditProfile"
        component={EditProfileScreen}
        options={screenTitles.editProfile}
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
              <CirclePlus size={28} color={colors.text} />
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
        name="ThemeScreen"
        component={ThemeScreen}
        options={screenTitles.theme}
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

// Main Tab Navigator with Swipe (MaterialTopTabs)

/**
 * How many tabs away a scene must be before it is frozen.
 *
 * Frozen scenes skip React entirely when the theme changes, so only the tab
 * you are on (and its neighbours) repaint. The threshold is 2, not 1, because
 * a scene at distance 1 is the page you swipe to: freezing it would blank it
 * out for the whole gesture. Setting this to 1 skips one more stack per theme
 * change at the cost of showing the incoming page's background until the
 * swipe settles.
 */
const TAB_FREEZE_DISTANCE = 2;

/**
 * Freezes a tab's whole stack while it is more than `TAB_FREEZE_DISTANCE`
 * tabs away from the focused one. `react-freeze` keeps the subtree mounted
 * (scroll positions and component state survive) but stops it from
 * re-rendering, and catches up with the current store state the moment it
 * comes back into range.
 */
function FreezeScene({
  routeKey,
  children,
}: {
  routeKey: string;
  children: React.ReactNode;
}) {
  const distance = useNavigationState((state) => {
    const myIndex = state.routes.findIndex((route) => route.key === routeKey);
    return myIndex === -1 ? 0 : Math.abs(myIndex - state.index);
  });

  return <Freeze freeze={distance >= TAB_FREEZE_DISTANCE}>{children}</Freeze>;
}

// Stable render function for the tab bar so navigator re-renders don't create a
// new element identity for it on every pass.
const renderTabBar = (props: MaterialTopTabBarProps) => <LiquidGlassTabBar {...props} />;

export const MainAppTabs = memo(() => {
  const { t } = useTranslation();
  const [showAds, setShowAds] = useState<boolean>(false);

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
    const task = runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  const screenOptions = useCallback(
    ({ route }: any): MaterialTopTabNavigationOptions => {
      const routeName = route.name as keyof MainTabParamList;
      const focusedRouteName = getFocusedRouteNameFromRoute(route);

      // Only enable swipe on the main screens of each tab
      const isBaseScreen =
        !focusedRouteName ||
        focusedRouteName === "HomeScreen" ||
        focusedRouteName === "NewsScreen" ||
        focusedRouteName === "GamesScreen" ||
        focusedRouteName === "SettingsScreen";

      return {
        swipeEnabled: isBaseScreen,
        lazy: true,
        lazyPreloadDistance: 0,
        tabBarLabel: t(`navigation.tabs.${routeName.toLowerCase()}`),
      };
    },
    [t],
  );

  return (
    <>
      <Tab.Navigator
        id="MainTabs"
        tabBarPosition="bottom"
        screenOptions={screenOptions}
        tabBar={renderTabBar}
      >
        <Tab.Screen name="Home">
          {({ route }) => (
            <FreezeScene routeKey={route.key}>
              <HomeStack />
            </FreezeScene>
          )}
        </Tab.Screen>
        <Tab.Screen name="News">
          {({ route }) => (
            <FreezeScene routeKey={route.key}>
              <NewsStack />
            </FreezeScene>
          )}
        </Tab.Screen>
        <Tab.Screen name="Games">
          {({ route }) => (
            <FreezeScene routeKey={route.key}>
              <GamesStack />
            </FreezeScene>
          )}
        </Tab.Screen>
        <Tab.Screen name="Settings">
          {({ route }) => (
            <FreezeScene routeKey={route.key}>
              <SettingsStack />
            </FreezeScene>
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {showAds && <AdBanner />}
    </>
  );
});
MainAppTabs.displayName = "MainAppTabs";

// Auth Stack

export const AuthStack = memo(() => (
  <AuthStackNav.Navigator id="AuthStack" screenOptions={HIDDEN_HEADER_OPTIONS}>
    <AuthStackNav.Screen name="Register" component={RegisterScreen} />
    <AuthStackNav.Screen name="Login" component={LoginScreen} />
    <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStackNav.Navigator>
));
AuthStack.displayName = "AuthStack";

const styles = StyleSheet.create({
  adContainer: {
    alignItems: "center",
    width: "100%",
  },
});
