import React, { useCallback, useMemo, memo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import { useAuthStore } from "@/src/store/useAuthStore";
import InviteFriendsBtn from "../components/InviteFriendsBtn";
import { openLink } from "@/src/lib/browser";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import type { MenuItem, SettingsNavProp } from "../types";

//  Constants
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone" as const;
const PRIVACY_POLICY_URL = "https://gz1.vercel.app/docs/index.html" as const;

// main

const SettingsScreen = memo((): React.ReactElement => {
  const navigation = useNavigation<SettingsNavProp>();
  const { t } = useTranslation();

  const currentUser = useAuthStore((state) => state.user);
  const isGuest = !currentUser || currentUser.isAnonymous;
  const { onScroll } = useScrollDirection();

  // Derived values

  const userAvatar = useMemo(() => {
    if (isGuest) return require("@/assets/anonymous.webp");
    return currentUser?.photoURL
      ? { uri: currentUser.photoURL }
      : require("@/assets/default_profile.webp");
  }, [currentUser?.photoURL, isGuest]);

  const displayName = useMemo<string>(() => {
    if (isGuest || !currentUser?.displayName)
      return t("auth.register.signUpButton");
    return currentUser.displayName;
  }, [currentUser?.displayName, isGuest, t]);

  // Handlers

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      await auth().signOut();
      await auth().signInAnonymously();
    } catch {
      Alert.alert(
        t("settings.signOut.errorTitle"),
        t("settings.signOut.errorMessage"),
      );
    }
  }, [t]);

  const handleOpenURL = useCallback(async (url: string): Promise<void> => {
    try {
      await openLink(url);
    } catch (e) {
      console.error("[SettingsScreen] Open URL error:", e);
    }
  }, []);

  const handleUserContainerPress = useCallback((): void => {
    navigation.navigate(isGuest ? "Auth" : "Profile");
  }, [isGuest, navigation]);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        id: "notifications",
        icon: "notifications",
        label: t("settings.menu.notifications"),
        onPress: () => navigation.navigate("NotificationSettings"),
      },
      {
        id: "lists",
        icon: "list",
        label: t("settings.menu.myLists"),
        onPress: () => navigation.navigate("UserListsScreen"),
      },
      {
        id: "rate",
        icon: "star",
        label: t("settings.menu.rateUs"),
        onPress: () => handleOpenURL(PLAY_STORE_URL),
      },
      { id: "invite", component: InviteFriendsBtn },
      {
        id: "contact",
        icon: "chatbubble-ellipses-sharp",
        label: t("settings.menu.contactUs"),
        onPress: () => navigation.navigate("ContactScreen"),
      },
      {
        id: "language",
        icon: "language",
        label: t("settings.menu.changeLanguage"),
        onPress: () => navigation.navigate("LanguageScreen"),
      },
      {
        id: "privacy",
        icon: "shield-checkmark-sharp",
        label: t("settings.menu.privacyPolicy"),
        onPress: () => handleOpenURL(PRIVACY_POLICY_URL),
      },
    ],
    [t, navigation, handleOpenURL],
  );

  const renderMenuItem = useCallback((item: MenuItem) => {
    if (item.component) {
      const Component = item.component;
      return <Component key={item.id} />;
    }
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.menuItem}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons
            name={item.icon!}
            size={20}
            color={COLORS.lightGray}
            style={styles.menuIcon}
          />
          <CustomText style={styles.menuLabel}>{item.label}</CustomText>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <TouchableOpacity
          style={styles.userContainer}
          onPress={handleUserContainerPress}
          activeOpacity={0.7}
        >
          <Image
            source={userAvatar}
            style={styles.avatar}
            contentFit="cover"
            transition={500}
            cachePolicy="memory-disk"
            allowDownscaling
          />
          <CustomText style={styles.displayName}>{displayName}</CustomText>
          {!isGuest && (
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          )}
        </TouchableOpacity>

        {menuItems.map(renderMenuItem)}

        {!isGuest && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="red"
                style={styles.menuIcon}
              />
              <CustomText style={styles.signOutText}>
                {t("settings.menu.signOut")}
              </CustomText>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});
SettingsScreen.displayName = "SettingsScreen";
export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  userContainer: {
    marginVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingVertical: 20,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 12,
  },
  avatar: {
    height: 50,
    width: 50,
    borderRadius: 25,
  },
  displayName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
    flex: 1,
  },
  menuItem: {
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    marginRight: 8,
  },
  menuLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  signOutButton: {
    marginVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(221, 119, 119, 0.2)",
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 18,
    fontWeight: "600",
    color: "red",
  },
});
