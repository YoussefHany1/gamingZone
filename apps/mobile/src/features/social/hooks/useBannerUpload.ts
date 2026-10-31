import { useCallback, useState } from "react";
import { ToastAndroid } from "react-native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { uploadProfileImage } from "@/src/features/settings/lib/cloudinary";
import { logger } from "@/src/lib/logger";

export type BannerUploadResult = {
  uploading: boolean;
  pickBanner: () => Promise<void>;
};

/**
 * Permission → picker → upload flow for the profile banner.
 *
 * Kept out of the editor component so the form stays declarative. The upload is
 * only staged in the draft (`onUploaded`); saving is a separate action.
 */
export function useBannerUpload(onUploaded: (url: string) => void): BannerUploadResult {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState<boolean>(false);

  const pickBanner = useCallback(async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      ToastAndroid.show(t("settings.profile.messages.permissionMsg"), ToastAndroid.LONG);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
    });

    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (!uri) return;

    setUploading(true);
    try {
      const url = await uploadProfileImage(uri);
      if (url) onUploaded(url);
    } catch (error) {
      logger.error("[useBannerUpload] banner upload failed:", error);
      ToastAndroid.show(t("settings.profile.messages.uploadFailed"), ToastAndroid.LONG);
    } finally {
      setUploading(false);
    }
  }, [onUploaded, t]);

  return { uploading, pickBanner };
}
