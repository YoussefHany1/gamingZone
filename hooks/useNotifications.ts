import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import NotificationService from "../notificationService";

/**
 * Handles all FCM setup for the authenticated user:
 *   - Creates an Android notification channel
 *   - Requests permission
 *   - Saves / refreshes the FCM token in Firestore
 *   - Syncs topic subscriptions from stored preferences
 *   - Presents foreground notifications as local Expo notifications
 */

// Types
type Unsubscribe = () => void;
interface NotificationPayload {
  title: string | undefined;
  body: string;
  data: Record<string, unknown>;
  sound: string;
  badge: number;
  categoryIdentifier: string;
  attachments?: Notifications.NotificationContentAttachmentIos[];
}

// Constants

// Android notification channel config

const NEWS_CHANNEL: Notifications.NotificationChannelInput = {
  name: "News Notifications",
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: "#779bdd",
  sound: "default",
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  enableVibrate: true,
  enableLights: true,
  showBadge: true,
  bypassDnd: false,
};
const NEWS_CHANNEL_ID = "news_notifications" as const;

// main
const useNotifications = (
  user: FirebaseAuthTypes.User | null | undefined
): void => {
  useEffect(() => {
    // Nothing to do until a user is authenticated
    if (!user) return;

    let unsubscribeOnMessage: Unsubscribe | undefined;
    let unsubscribeTokenRefresh: Unsubscribe | undefined;

    const setupFcm = async (): Promise<void> => {
      try {
        // Create / update Android notification channel
        await Notifications.setNotificationChannelAsync(
          NEWS_CHANNEL_ID,
          NEWS_CHANNEL
        );

        // Request FCM permission
        const authStatus = await messaging().requestPermission();
        const isEnabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!isEnabled) return;

        // Save token and sync topic subscriptions
        const token = await messaging().getToken();
        await NotificationService.saveFCMToken(user.uid, token);

        const preferences = await NotificationService.getUserPreferences(
          user.uid
        );
        await NotificationService.syncUserPreferences(user.uid, preferences);

        // Foreground message handler
        unsubscribeOnMessage = messaging().onMessage(
          async (
            remoteMessage: FirebaseMessagingTypes.RemoteMessage
          ): Promise<void> => {
            try {
              const title =
                remoteMessage.notification?.title ??
                (remoteMessage.data?.["title"] as string | undefined);

              // Silent data-only messages → skip local notification
              if (!title) return;

              const body =
                remoteMessage.notification?.body ??
                (remoteMessage.data?.["body"] as string | undefined) ??
                "";

              const image =
                (
                  remoteMessage.notification
                    ?.android as { imageUrl?: string } | undefined
                )?.imageUrl ??
                (remoteMessage.notification as { imageUrl?: string } | undefined)
                  ?.imageUrl ??
                (remoteMessage.data?.["thumbnail"] as string | undefined);

              const content: NotificationPayload = {
                title,
                body,
                data: (remoteMessage.data as Record<string, unknown>) ?? {},
                sound: "default",
                badge: 1,
                categoryIdentifier: NEWS_CHANNEL_ID,
              };

              if (image) {
                content.attachments = [
                  {
                    url: image,
                    identifier: "news-image",
                    type: "image",
                    typeHint: "image",
                  },
                ];
              }

              await Notifications.scheduleNotificationAsync({
                content,
                trigger: null,
              });
            } catch (err) {
              console.error(
                "[useNotifications] Failed to present foreground notification:",
                err
              );
            }
          }
        );

        // Keep the stored token fresh when FCM rotates it
        unsubscribeTokenRefresh = messaging().onTokenRefresh(
          async (newToken: string): Promise<void> => {
            await NotificationService.saveFCMToken(user.uid, newToken);
          }
        );
      } catch (error) {
        console.error("[useNotifications] FCM init error:", error);
      }
    };

    setupFcm();

    return () => {
      unsubscribeOnMessage?.();
      unsubscribeTokenRefresh?.();
    };
  }, [user]); // Re-run only when the authenticated user changes
};

export default useNotifications;