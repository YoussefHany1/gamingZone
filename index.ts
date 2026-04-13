import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import "@react-native-firebase/app";
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { enableScreens } from "react-native-screens";

// Disable react-native-screens optimization to fix the notorious Android background resume blank screen.
enableScreens(false);

import App from "./App";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Root Registration
registerRootComponent(App);

// Background/quit state messages handler
messaging().setBackgroundMessageHandler(
  async (remoteMessage: FirebaseMessagingTypes.RemoteMessage): Promise<void> => {
    // console.log("📨 Background message received:", remoteMessage?.messageId);
    // console.log("📨 Background message data:", remoteMessage?.data);
    // console.log(
    //   "📨 Background message notification:",
    //   remoteMessage?.notification
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
      console.error("❌ Error handling background message:", error);
    }
  });
