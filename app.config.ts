import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";


// Defining the structure of .env
interface EnvVariables {
  APPWRITE_PROJECT?: string;
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_ENDPOINT?: string;
  GOOGLE_WEB_CLIENT_ID?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_UPLOAD_PRESET?: string;
}

// The extra extension in ExpoConfig with custom variables
interface AppExtra extends EnvVariables {
  eas?: Record<string, unknown>;
}

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

  return {
    ...(config as any),
    ...config,
    name: config.name ?? "GamingZone",
    slug: config.slug ?? "gaming-zone",
    android: {
      ...config.android,
      package: "com.yh.gamingzone",
    },
    mods: {
      android: {
        manifest: async (modConfig) => {
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
              item.$["android:name"] !==
              "expo.modules.updates.EXPO_UPDATES_CHANNEL"
          );

          mainApplication["meta-data"].push(channelMetaData);

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