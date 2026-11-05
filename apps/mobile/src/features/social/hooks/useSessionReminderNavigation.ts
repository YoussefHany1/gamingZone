import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import type { NavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "@/src/App";
import { logger } from "@/src/lib/logger";
import {
  SESSION_REMINDER_DATA_TYPE,
} from "../lib/sessionReminderScheduler";

/**
 * useSessionReminderNavigation — opening a chat by tapping a session reminder.
 *
 * Handles both cold-start and background taps:
 *   - a response received while the app subscribes fires its listener as usual,
 *   - a response delivered during process start resolves through
 *     getLastNotificationResponseAsync right at effect time.
 *
 * Session reminders, incoming social messages, and session requests all carry
 * a conversationId and open the relevant chat. Other FCM/test notifications
 * are ignored here.
 */

type NavigationRef = { current: NavigationContainerRef<RootStackParamList> | null };

export function useSessionReminderNavigation(navigationRef: NavigationRef): void {
  useEffect(() => {
    let mounted = true;

    const handleResponse = (response: Notifications.NotificationResponse | null): void => {
      if (!response || !mounted) return;
      const data = response.notification.request.content.data ?? {};
      const type = data["type"];
      if (
        type !== SESSION_REMINDER_DATA_TYPE &&
        type !== "social_message" &&
        type !== "session_request"
      ) return;
      const conversationId = data["conversationId"];
      if (typeof conversationId !== "string" || conversationId.length === 0) return;

      // MainApp → SocialStack → ChatScreen, typed through the root param list.
      navigationRef.current?.navigate("MainApp", {
        screen: "Social",
        params: { screen: "ChatScreen", params: { conversationId } },
      });
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    void Notifications.getLastNotificationResponseAsync()
      .then(handleResponse)
      .catch((error) => {
        logger.debug("[sessionReminders] Cold-start response check failed:", error);
      });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [navigationRef]);
}
