import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import COLORS from "../constants/colors";
import InviteFriendsBtn from "../components/InviteFriendsBtn";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone";
const PRIVACY_POLICY_URL = "https://youssefhany1.github.io/gamingZoneApp/";

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const currentUser = auth().currentUser;
  const isAnonymous = currentUser?.isAnonymous;

  const userAvatar = useMemo(() => {
    if (isAnonymous) {
      return require("../assets/anonymous.png");
    }
    return currentUser?.photoURL
      ? { uri: currentUser.photoURL }
      : require("../assets/default_profile.png");
  }, [currentUser?.photoURL, isAnonymous]);

  const displayName = useMemo(() => {
    return currentUser?.displayName || t("auth.login.signInButton");
  }, [currentUser?.displayName, t]);

  const handleSignOut = useCallback(async () => {
    try {
      await auth().signOut();
      console.log("✅ User signed out successfully");
    } catch (error) {
      console.error("❌ Sign out error:", error);
      Alert.alert(
        t("settings.signOut.errorTitle"),
        t("settings.signOut.errorMessage"),
      );
    }
  }, [t]);

  const handleOpenURL = useCallback(async (url) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("❌ Error opening URL:", error);
    }
  }, []);

  const handleUserContainerPress = useCallback(() => {
    if (isAnonymous) {
      handleSignOut();
    } else {
      navigation.navigate("Profile");
    }
  }, [isAnonymous, handleSignOut, navigation]);

  const menuItems = useMemo(
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
      {
        id: "invite",
        component: InviteFriendsBtn,
      },
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

  const renderMenuItem = useCallback((item) => {
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
            name={item.icon}
            size={20}
            color={COLORS.lightGray}
            style={styles.menuIcon}
          />
          <Text style={styles.menuLabel}>{item.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
            allowDownscaling={true}
          />
          <Text style={styles.displayName}>{displayName}</Text>
        </TouchableOpacity>

        {menuItems.map(renderMenuItem)}

        {!isAnonymous && (
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
              <Text style={styles.signOutText}>
                {t("settings.menu.signOut")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 20,
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
    marginVertical: 10,
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
    color: COLORS.danger || "red",
  },
});

export default SettingsScreen;
