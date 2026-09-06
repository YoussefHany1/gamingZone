import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";

// Defining the structure of .env
type EnvVariables = {
  APPWRITE_PROJECT?: string;
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_ENDPOINT?: string;
  GOOGLE_WEB_CLIENT_ID?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_UPLOAD_PRESET?: string;
};

// The extra extension in ExpoConfig with custom variables
type AppExtra = EnvVariables & {
  eas?: Record<string, unknown>;
};

function getEnvVariables(): EnvVariables {
  return {
    APPWRITE_PROJECT: process.env["APPWRITE_PROJECT"],
    APPWRITE_DATABASE_ID: process.env["APPWRITE_DATABASE_ID"],
    APPWRITE_ENDPOINT: process.env["APPWRITE_ENDPOINT"],
    GOOGLE_WEB_CLIENT_ID: process.env["GOOGLE_WEB_CLIENT_ID"],
    CLOUDINARY_CLOUD_NAME: process.env["CLOUDINARY_CLOUD_NAME"],
    CLOUDINARY_API_KEY: process.env["CLOUDINARY_API_KEY"],
    CLOUDINARY_UPLOAD_PRESET: process.env["CLOUDINARY_UPLOAD_PRESET"],
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const envVars = getEnvVariables();

  // Determine build variant — set by eas.json "env" per profile
  const APP_VARIANT = process.env["APP_VARIANT"] ?? "production";

  const isDev = APP_VARIANT === "development";
  const isPreview = APP_VARIANT === "preview";

  // Package name — dev/preview get a ".dev" suffix so both can coexist on device
  const androidPackage =
    isDev || isPreview ? "com.yh.gamingzone.dev" : "com.yh.gamingzone";

  // App display name — dev/preview get a badge so you can tell them apart
  const appName = isDev
    ? "GamingZone (Dev)"
    : isPreview
      ? "GamingZone (Preview)"
      : "Gaming Zone";

  return {
    ...(config as any),
    ...config,
    name: appName,
    slug: config.slug ?? "gaming-zone",
    android: {
      ...config.android,
      package: androidPackage,
    },
    mods: {
      android: {
        manifest: async (modConfig: any) => {
          const androidManifest = modConfig.modResults;
          const mainApplication = androidManifest.manifest.application?.[0];

          if (!mainApplication) return modConfig;

          // Definition of Expo Updates channel data
          const channelMetaData = {
            $: {
              "android:name": "expo.modules.updates.EXPO_UPDATES_CHANNEL",
              "android:value": "production",
            },
          };

          // Ensuring the presence of a meta-data array
          mainApplication["meta-data"] = mainApplication["meta-data"] ?? [];

          // Ensuring no duplicate channel definitions
          mainApplication["meta-data"] = mainApplication["meta-data"].filter(
            (item: { $: { "android:name": string } }) =>
              item.$["android:name"] !== "expo.modules.updates.EXPO_UPDATES_CHANNEL",
          );

          mainApplication["meta-data"].push(channelMetaData);

          // react-native-firebase/messaging declares its own notification color,
          // which collides with expo-notifications during manifest merging.
          // Force our value to win.
          const notificationColorKeys = [
            "com.google.firebase.messaging.default_notification_color",
            "expo.modules.notifications.default_notification_color",
          ];

          mainApplication["meta-data"].forEach((item: { $: Record<string, string> }) => {
            const itemName = item.$["android:name"];

            if (
              itemName &&
              notificationColorKeys.includes(itemName) &&
              item.$["android:resource"]
            ) {
              item.$["tools:replace"] = "android:resource";
            }
          });

          return modConfig;
        },
      },
    },
    extra: {
      ...config.extra,
      ...envVars,
    } as AppExtra,
  };
};
