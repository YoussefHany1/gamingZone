import { useCallback, useMemo } from "react";
import { ToastAndroid } from "react-native";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { useTranslation } from "react-i18next";
import NotificationService from "@/src/services/notificationService";
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences";
import { logger } from "@/src/lib/logger";

/** Notification category used for game release subscriptions. */
const NOTIF_CATEGORY = "game_release";

export type UseGameReleaseNotificationProps = {
  gameId: number | string | null | undefined;
  user: FirebaseAuthTypes.User | null;
};

export type UseGameReleaseNotificationResult = {
  /** Whether the current user is subscribed to this game's release topic. */
  isSubscribed: boolean;
  /** Toggles the subscription (login-guarded) and shows a confirmation toast. */
  handleToggleNotification: () => Promise<void>;
};

/**
 * Owns the "notify me when this game releases" subscription for the game
 * details screen: topic naming, current subscribed state, and the
 * login-guarded toggle (with success/error toasts).
 */
export const useGameReleaseNotification = ({
  gameId,
  user,
}: UseGameReleaseNotificationProps): UseGameReleaseNotificationResult => {
  const { t } = useTranslation();
  const { preferences, toggleSource } = useNotificationPreferences();

  const topicName = useMemo(() => {
    if (!gameId) return "";
    return NotificationService.getTopicName(NOTIF_CATEGORY, String(gameId));
  }, [gameId]);

  const isSubscribed = Boolean(topicName && preferences[topicName]);

  const handleToggleNotification = useCallback(async () => {
    if (!user || user.isAnonymous) {
      ToastAndroid.show(t("common.loginRequired"), ToastAndroid.LONG);
      return;
    }

    if (!gameId) return;

    const willEnable = !isSubscribed;

    try {
      await toggleSource(NOTIF_CATEGORY, String(gameId));
      ToastAndroid.show(
        willEnable ? t("games.details.subscribed") : t("games.details.unsubscribed"),
        ToastAndroid.SHORT,
      );
    } catch (e) {
      logger.error("Toggle notification error:", e);
      ToastAndroid.show(t("common.error"), ToastAndroid.SHORT);
    }
  }, [user, gameId, isSubscribed, toggleSource, t]);

  return { isSubscribed, handleToggleNotification };
};
