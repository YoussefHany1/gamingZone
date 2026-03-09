import { Client, Databases } from "react-native-appwrite";
import Constants from "expo-constants";

// Types
interface AppExtra {
  APPWRITE_PROJECT?: string;
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_ENDPOINT?: string;
}

// Config
const extra = Constants.expoConfig?.extra as AppExtra | undefined;

const APPWRITE_PROJECT: string = extra?.APPWRITE_PROJECT ?? "";
const APPWRITE_ENDPOINT: string = "https://fra.cloud.appwrite.io/v1";

if (!APPWRITE_PROJECT) {
  console.warn(
    "[Appwrite] APPWRITE_PROJECT is not set. Check your app.config.ts extra values."
  );
}

// Client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT);

const databases = new Databases(client);

export { client, databases };