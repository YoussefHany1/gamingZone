import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import "@react-native-firebase/app";
import "@react-native-firebase/crashlytics";
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { enableScreens } from "react-native-screens";

// Enable react-native-screens optimization for better memory usage across all devices.
enableScreens(true);

import App from "./src/App";
import { logger } from "@/src/lib/logger";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification:
    async (): Promise<Notifications.NotificationBehavior> => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
});

// Background/quit state messages handler — must be registered synchronously at
// the top level (and before `registerRootComponent`) so Firebase can dispatch
// data-only messages while the app is backgrounded or quit.
messaging().setBackgroundMessageHandler(
  async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  ): Promise<void> => {
    // console.log("📨 Background message received:", remoteMessage?.messageId);
    // console.log("📨 Background message data:", remoteMessage?.data);
    // console.log(
    //   "📨 Processing background notification:",
    //   remoteMessage?.notification,
    // );

    // Handle background notification
    try {
      const _title: string =
        remoteMessage?.notification?.title ??
        (remoteMessage?.data?.["title"] as string | undefined) ??
        "📰 New News";
      const _body: string =
        remoteMessage?.notification?.body ??
        (remoteMessage?.data?.["body"] as string | undefined) ??
        "";

      // console.log("📨 Processing background notification:", { title, body });
      // console.log("✅ Background notification processed");
    } catch (error) {
      logger.error("❌ Error handling background message:", error);
    }
  },
);

// Root Registration
registerRootComponent(App);
