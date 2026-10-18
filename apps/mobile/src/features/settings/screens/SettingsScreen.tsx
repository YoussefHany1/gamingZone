import React, { memo, useCallback } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import SettingsMenuList from "../components/settings/SettingsMenuList";
import SettingsSignOutButton from "../components/settings/SettingsSignOutButton";
import SettingsUserCard from "../components/settings/SettingsUserCard";
import { useSettingsMenuItems } from "../hooks/useSettingsMenuItems";
import { useSignOut } from "../hooks/useSignOut";
import type { SettingsNavProp } from "../types";

const SettingsScreen = memo((): React.ReactElement => {
  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingHorizontal: 16,
    },
    scrollContent: {
      paddingBottom: 90,
    },
  }));

  const navigation = useNavigation<SettingsNavProp>();
  const { t, i18n } = useTranslation();
  const { onScroll } = useScrollDirection();

  const currentUser = useAuthStore((state) => state.user);
  const isGuest = !currentUser || currentUser.isAnonymous;
  const isRtl = i18n.language === "ar";

  const { menuItems } = useSettingsMenuItems();
  const { confirmSignOut } = useSignOut();

  const handleUserCardPress = useCallback((): void => {
    navigation.navigate(isGuest ? "Auth" : "Profile");
  }, [isGuest, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <SettingsUserCard
          displayName={currentUser?.displayName ?? null}
          photoURL={currentUser?.photoURL ?? null}
          isGuest={isGuest}
          isRtl={isRtl}
          onPress={handleUserCardPress}
        />

        <SettingsMenuList items={menuItems} isRtl={isRtl} />

        {!isGuest && (
          <SettingsSignOutButton
            label={t("settings.menu.signOut")}
            onPress={confirmSignOut}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
});
SettingsScreen.displayName = "SettingsScreen";
export default SettingsScreen;
