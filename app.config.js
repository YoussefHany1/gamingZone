import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      package: "com.yh.gamingzone",
    },
    mods: {
      android: {
        manifest: async (config) => {
          const androidManifest = config.modResults;
          const mainApplication = androidManifest.manifest.application[0];

          // إضافة القناة
          const channelMetaData = {
            $: {
              "android:name": "expo.modules.updates.EXPO_UPDATES_CHANNEL",
              "android:value": "production", // اسم القناة هنا
            },
          };

          // التأكد من وجود مصفوفة meta-data
          mainApplication["meta-data"] = mainApplication["meta-data"] || [];

          // حذف أي تعريف قديم للقناة لتجنب التكرار
          mainApplication["meta-data"] = mainApplication["meta-data"].filter(
            (item) =>
              item.$["android:name"] !==
              "expo.modules.updates.EXPO_UPDATES_CHANNEL"
          );

          // إضافة التعريف الجديد
          mainApplication["meta-data"].push(channelMetaData);

          return config;
        },
      },
    },
    extra: {
      ...config.extra,
      APPWRITE_PROJECT: process.env.APPWRITE_PROJECT,
      APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
      APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,

      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
    },
  };
};
