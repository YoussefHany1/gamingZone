import { useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Cpu,
  Languages,
  List,
  MessageSquare,
  Palette,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import { useIsAdmin } from "@/src/hooks/useIsAdmin";
import { openLink } from "@/src/lib/browser";
import AdminAdsToggle from "../components/AdminAdsToggle";
import InviteFriendsBtn from "../components/InviteFriendsBtn";
import type { MenuItem, SettingsNavProp } from "../types";
import { logger } from "@/src/lib/logger";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.yh.gamingzone";
const PRIVACY_POLICY_URL = "https://gz1.games/privacy-policy";

export type UseSettingsMenuItemsResult = {
  menuItems: MenuItem[];
};

/** Builds the settings menu rows, including the admin-only ads toggle. */
export function useSettingsMenuItems(): UseSettingsMenuItemsResult {
  const navigation = useNavigation<SettingsNavProp>();
  const { t } = useTranslation();
  const isAdmin = useIsAdmin();

  const handleOpenURL = useCallback(async (url: string): Promise<void> => {
    try {
      await openLink(url);
    } catch (e) {
      logger.error("[SettingsScreen] Open URL error:", e);
    }
  }, []);

  const menuItems = useMemo<MenuItem[]>(
    () => [
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
          try {
            const nav: any = navigation;
            if (nav.getParent?.()?.getParent?.()?.navigate) {
              nav.getParent().getParent().navigate("Settings", { screen: "UserListsScreen" });
              return;
            }
            if (nav.getParent?.()?.navigate) {
              nav.getParent().navigate("UserListsScreen");
              return;
            }
            nav.navigate("UserListsScreen");
          } catch {
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
        id: "blockedUsers",
        icon: ShieldAlert,
        label: t("settings.menu.blockedUsers"),
        onPress: () => {
          const parent = (navigation as any).getParent?.();
          if (parent) {
            parent.navigate("Settings", { screen: "BlockedUsersScreen" });
          } else {
            (navigation as any).navigate("BlockedUsersScreen");
          }
        },
      },
      ...(isAdmin ? [{ id: "adminAds", component: AdminAdsToggle }] : []),
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
