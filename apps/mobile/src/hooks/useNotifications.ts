import { useEffect } from "react";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import messaging from "@react-native-firebase/messaging";
import auth from "@react-native-firebase/auth";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import NotificationService from "@/src/services/notificationService";

/**
 * Handles all FCM setup for the authenticated user:
 *   - Creates/updates the Android notification channel
 *   - Requests permission
 *   - Saves / refreshes the FCM token in Firestore
 *   - Syncs topic subscriptions from stored preferences
 *   - Presents foreground messages as local Expo notifications
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEWS_CHANNEL_ID = "news_notifications" as const;

const NEWS_CHANNEL: Notifications.NotificationChannelInput = {
  name: "News Notifications",
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: "#779bdd",
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  enableVibrate: true,
  enableLights: true,
  showBadge: true,
  bypassDnd: false,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the notification image URL from the remote message, checking
 * Android-specific fields, then the generic notification object, then data.
 */
function extractImageUrl(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): string | undefined {
  return (
    (remoteMessage.notification?.android as { imageUrl?: string } | undefined)
      ?.imageUrl ?? (remoteMessage.data?.["thumbnail"] as string | undefined)
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const useNotifications = (
  user: FirebaseAuthTypes.User | null | undefined,
): void => {
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    /**
     * True while `user` is still the signed-in (non-anonymous) Firebase user.
     * Guards every async step so a logout mid-setup can never fire Firestore
     * requests with a stale uid / mismatched auth token.
     */
    const isSessionValid = (): boolean => {
      const currentUser = auth().currentUser;
      return (
        !!currentUser && !currentUser.isAnonymous && currentUser.uid === user.uid
      );
    };

    let unsubscribeOnMessage: Unsubscribe | undefined;
    let unsubscribeTokenRefresh: Unsubscribe | undefined;

    // Guests keep foreground-notification presentation, but skip all
    // Firestore token/preference syncing: their session is ephemeral and any
    // sync right after a logout races against Firestore picking up the fresh
    // anonymous credentials -> firestore/permission-denied noise.
    const isGuest = user.isAnonymous;

    const setup = async (): Promise<void> => {
      try {
        // Ensure the Android notification channel exists before doing anything else.
        await Notifications.setNotificationChannelAsync(
          NEWS_CHANNEL_ID,
          NEWS_CHANNEL,
        );

        if (!isGuest) {
          const authStatus = await messaging().requestPermission();
          const isAuthorized =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (!isAuthorized) return;

          // Bail out if the session changed while requesting permission.
          if (cancelled || !isSessionValid()) return;

          // Register token and sync topic subscriptions with stored preferences.
          const token = await messaging().getToken();
          if (cancelled || !isSessionValid()) return;
          await NotificationService.saveFCMToken(user.uid, token);

          const preferences = await NotificationService.getUserPreferences(
            user.uid,
          );
          if (cancelled || !isSessionValid()) return;
          await NotificationService.syncUserPreferences(user.uid, preferences);
        }

        // Foreground message handler — present silent messages are skipped.
        unsubscribeOnMessage = messaging().onMessage(
          async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
            try {
              const title =
                remoteMessage.notification?.title ??
                (remoteMessage.data?.["title"] as string | undefined);

              // Skip data-only messages without a visible title.
              if (!title) return;

              const body =
                remoteMessage.notification?.body ??
                (remoteMessage.data?.["body"] as string | undefined) ??
                "";

              const imageUrl = extractImageUrl(remoteMessage);

              await Notifications.scheduleNotificationAsync({
                content: {
                  title,
                  body,
                  data: (remoteMessage.data as Record<string, unknown>) ?? {},
                  sound: true,
                  badge: 1,
                  categoryIdentifier: NEWS_CHANNEL_ID,
                  ...(imageUrl && {
                    attachments: [
                      {
                        url: imageUrl,
                        identifier: "news-image",
                        type: "image",
                        typeHint: "image",
                      },
                    ],
                  }),
                },
                trigger: null,
              });
            } catch (err) {
              console.error(
                "[useNotifications] Failed to present foreground notification:",
                err,
              );
            }
          },
        );

        // Keep the stored token current when FCM rotates it.
        unsubscribeTokenRefresh = messaging().onTokenRefresh(
          async (newToken: string) => {
            // Session may have ended between the rotation and this callback.
            if (cancelled || !isSessionValid()) return;
            await NotificationService.saveFCMToken(user.uid, newToken);
          },
        );
      } catch (error) {
        console.error("[useNotifications] FCM setup error:", error);
      }
    };

    // Defer FCM setup until after app startup interactions are done
    // so it doesn't compete with rendering on weak devices.
    const task = runAfterInteractions(() => {
      setup();
    });

    return () => {
      cancelled = true;
      task.cancel();
      unsubscribeOnMessage?.();
      unsubscribeTokenRefresh?.();
    };
  }, [user]);
};

export default useNotifications;
