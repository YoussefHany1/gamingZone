import Constants from "expo-constants";

// Centralizes all environment-driven configuration values that are sourced
// from expo-constants, so each consumer doesn't have to redeclare the
// interface or handle the fallback logic independently.

type AppExtra = {
  APPWRITE_DATABASE_ID?: string;
  APPWRITE_PROJECT?: string;
  APPWRITE_ENDPOINT?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const APPWRITE_DATABASE_ID: string = extra.APPWRITE_DATABASE_ID ?? "";

if (!APPWRITE_DATABASE_ID) {
  console.warn(
    "[Config] APPWRITE_DATABASE_ID is not set. Check your app.config.ts extra values.",
  );
}
