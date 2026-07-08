import { Client, Databases } from "react-native-appwrite";
import Constants from "expo-constants";

// --------------------------------------------------------------------------
// Patch WebSocket to prevent "INVALID_STATE_ERR" crashes in React Native
// when Appwrite Realtime tries to send data on a closed connection.
// --------------------------------------------------------------------------
if (typeof WebSocket !== "undefined") {
  const originalSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    if (this.readyState === WebSocket.OPEN) {
      try {
        originalSend.call(this, data);
      } catch (e) {
        console.warn("[WebSocket Patch] Caught send error:", e);
      }
    } else {
      console.warn(
        `[WebSocket Patch] Ignored send because readyState is ${this.readyState} (not OPEN)`,
      );
    }
  };
}
// --------------------------------------------------------------------------

// Types
type AppExtra = {
  APPWRITE_PROJECT?: string;
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_ENDPOINT?: string;
};

// Config
const extra = Constants.expoConfig?.extra as AppExtra | undefined;

const APPWRITE_PROJECT: string = extra?.APPWRITE_PROJECT ?? "";
const APPWRITE_ENDPOINT: string = "https://fra.cloud.appwrite.io/v1";

if (!APPWRITE_PROJECT) {
  console.warn(
    "[Appwrite] APPWRITE_PROJECT is not set. Check your app.config.ts extra values.",
  );
}

// Client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT);

const databases = new Databases(client);

export { client, databases };
