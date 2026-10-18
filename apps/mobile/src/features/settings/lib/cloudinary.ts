import Constants from "expo-constants";
import type { CloudinaryResponse } from "../types";
import { logger } from "@/src/lib/logger";

/**
 * Cloudinary upload target.
 *
 * `expoConfig.extra` is the primary source because the values are injected at
 * build time by EAS; the `EXPO_PUBLIC_*` fallbacks cover local development.
 */
const CLOUDINARY_CLOUD_NAME: string =
  Constants?.expoConfig?.extra?.CLOUDINARY_CLOUD_NAME ??
  process.env.CLOUDINARY_CLOUD_NAME ??
  "";
const CLOUDINARY_API_KEY: string =
  Constants?.expoConfig?.extra?.CLOUDINARY_API_KEY ??
  process.env.CLOUDINARY_API_KEY ??
  "";
const CLOUDINARY_UPLOAD_PRESET: string =
  Constants?.expoConfig?.extra?.CLOUDINARY_UPLOAD_PRESET ??
  process.env.CLOUDINARY_UPLOAD_PRESET ??
  "";

/**
 * Uploads a locally-picked image to Cloudinary and returns its public URL.
 *
 * Anything that is not a `file://` URI is already remote (a curated avatar, an
 * existing `photoURL`), so it is returned untouched. Throws if the upload is
 * rejected — callers decide how to report that.
 */
export async function uploadProfileImage(uri: string | null): Promise<string | null> {
  if (!uri || !uri.startsWith("file://")) return uri;

  const extension = uri.split(".").pop();

  const data = new FormData();
  data.append("file", {
    uri,
    type: `image/${extension}`,
    name: `profile.${extension}`,
  } as unknown as Blob);
  data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  data.append("api_key", CLOUDINARY_API_KEY);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const response = await fetch(url, {
    method: "POST",
    body: data,
    headers: { "Content-Type": "multipart/form-data" },
  });

  const json: CloudinaryResponse = await response.json();

  if (!json.secure_url) {
    logger.error("Cloudinary error:", json);
    throw new Error("Image upload failed.");
  }

  return json.secure_url;
}
