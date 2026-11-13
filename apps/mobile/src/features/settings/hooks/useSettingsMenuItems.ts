import { useCallback, useMemo } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Cpu,
  Languages,
  List,
  MessageSquare,
  Palette,
  Shield,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import { useAdminAccess } from "@/src/hooks/useIsAdmin";
import { openLink } from "@/src/lib/browser";
import InviteFriendsBtn from "../components/InviteFriendsBtn";
import type { MenuItem, SettingsNavProp } from "../types";
import { logger } from "@/src/lib/logger";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.yh.gamingzone";
const PRIVACY_POLICY_URL = "https://gz1.games/privacy-policy";

// Re-reading the claim forces a network token refresh, so rapid tab switches
// reuse the previous verdict instead of hitting the auth backend each time.
const ADMIN_REFRESH_ON_FOCUS_MS = 60_000;
let lastAdminFocusRefreshAt = 0;

export type UseSettingsMenuItemsResult = {
  menuItems: MenuItem[];
};

/** Builds the settings menu rows, including the admin-only dashboard link. */
export function useSettingsMenuItems(): UseSettingsMenuItemsResult {
  const navigation = useNavigation<SettingsNavProp>();
  const { t } = useTranslation();
  const { isAdmin, refresh: refreshAdminAccess } = useAdminAccess();

  // Settings is where the admin row lives. Re-read the claim on focus so a
  // demotion performed elsewhere hides the row without waiting for the cache.
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastAdminFocusRefreshAt < ADMIN_REFRESH_ON_FOCUS_MS) {
        return;
      }
      lastAdminFocusRefreshAt = Date.now();
      void refreshAdminAccess();
    }, [refreshAdminAccess]),
  );

  const handleOpenURL = useCallback(async (url: string): Promise<void> => {
    try {
      await openLink(url);
    } catch (e) {
      logger.error("[SettingsScreen] Open URL error:", e);
    }
  }, []);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      ...(isAdmin
        ? [
            {
              id: "adminDashboard",
              icon: Shield,
              label: t("settings.menu.adminDashboard"),
              onPress: () => {
                const parent = (navigation as any).getParent?.();
                if (parent) {
                  parent.navigate("Settings", { screen: "AdminDashboard" });
                } else {
                  (navigation as any).navigate("AdminDashboard");
                }
              },
            },
          ]
        : []),
      {
        id: "pcSpecs",
        icon: Cpu,
        label: t("settings.menu.myPc"),
        onPress: () => {
          const parent = (navigation as any).getParent?.();
          if (parent) {
            parent.navigate("Settings", { screen: "PcSpecsScreen" });
          } else {
            (navigation as any).navigate("PcSpecsScreen");
          }
        },
      },
      {
        id: "lists",
        icon: List,
        label: t("settings.menu.myLists"),
        onPress: () => {
          const parent = (navigation as any).getParent?.();
          if (parent) {
            parent.navigate("Settings", { screen: "UserListsScreen" });
          } else {
            (navigation as any).navigate("UserListsScreen");
          }
        },
      },
      {
        id: "notifications",
        icon: Bell,
        label: t("settings.menu.notifications"),
        onPress: () => {
          const parent = (navigation as any).getParent?.();
          if (parent) {
            parent.navigate("Settings", { screen: "NotificationSettings" });
          } else {
            (navigation as any).navigate("NotificationSettings");
          }
        },
      },
      {
        id: "theme",
        icon: Palette,
        label: `${t("settings.theme.title")} (Beta)`,
        onPress: () => {
          const parent = (navigation as any).getParent?.();
          if (parent) {
            parent.navigate("Settings", { screen: "ThemeScreen" });
          } else {
            (navigation as any).navigate("ThemeScreen");
          }
        },
      },
      {
        id: "language",
        icon: Languages,
        label: t("settings.menu.changeLanguage"),
        onPress: () => {
          const parent = (navigation as any).getParent?.();
          if (parent) {
            parent.navigate("Settings", { screen: "LanguageScreen" });
          } else {
            (navigation as any).navigate("LanguageScreen");
          }
        },
      },
      {
        id: "rate",
        icon: Star,
        label: t("settings.menu.rateUs"),
        onPress: () => handleOpenURL(PLAY_STORE_URL),
      },
      { id: "invite", component: InviteFriendsBtn },
      {
        id: "contact",
        icon: MessageSquare,
        label: t("settings.menu.contactUs"),
        onPress: () => {
          const parent = (navigation as any).getParent?.();
          if (parent) {
            parent.navigate("Settings", { screen: "ContactScreen" });
          } else {
            (navigation as any).navigate("ContactScreen");
          }
        },
      },
      {
        id: "privacy",
        icon: ShieldCheck,
        label: t("settings.menu.privacyPolicy"),
        onPress: () => handleOpenURL(PRIVACY_POLICY_URL),
      },
    ],
    [t, navigation, handleOpenURL, isAdmin],
  );

  return { menuItems };
}
