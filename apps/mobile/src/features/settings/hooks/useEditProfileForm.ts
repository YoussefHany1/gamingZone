import { useCallback, useEffect, useState } from "react";
import { ToastAndroid } from "react-native";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/src/store/useAuthStore";
import { uploadProfileImage } from "../lib/cloudinary";
import { firstMissingField, type ProfileFormField } from "../lib/profileForm";
import type { FirestoreUser } from "../types";
import { logger } from "@/src/lib/logger";

/** Toast copy for each field the form can be missing. */
const MISSING_FIELD_MESSAGES: Record<ProfileFormField, string> = {
  name: "settings.profile.messages.missingName",
  dob: "settings.profile.messages.missingDob",
  gender: "settings.profile.messages.missingGender",
  country: "settings.profile.messages.missingCountry",
  platform: "settings.profile.messages.missingPlatform",
};

export type UseEditProfileFormResult = {
  name: string;
  setName: (value: string) => void;
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  dob: string;
  /** Whether the native date picker is open. */
  showDatePicker: boolean;
  openDatePicker: () => void;
  handleDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  gender: string;
  setGender: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  platform: string;
  setPlatform: (value: string) => void;
  isSaving: boolean;
  isAdmin: boolean;
  /** Opens the media library and stores the picked file URI. */
  pickImage: () => Promise<void>;
  save: () => Promise<void>;
};

/**
 * Owns the edit-profile form: the field state, loading it from Auth then
 * Firestore, and persisting it back to both.
 */
export function useEditProfileForm(): UseEditProfileFormResult {
  const { t } = useTranslation();
  const { currentUser, refreshUser } = useAuthStore(
    useShallow((state) => ({
      currentUser: state.user,
      refreshUser: state.refreshUser,
    })),
  );

  const [name, setName] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Load profile data from Auth (fast) then Firestore (complete).
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    setName(currentUser.displayName ?? "");
    setImageUri(currentUser.photoURL ?? null);

    const fetchUserData = async (): Promise<void> => {
      try {
        const userDocument = await firestore()
          .collection("users")
          .doc(currentUser.uid)
          .get();

        if (!isMounted) return;

        if (userDocument.exists()) {
          const userData = userDocument.data() as FirestoreUser;
          setName(userData.displayName ?? "");
          setImageUri(userData.photoURL ?? null);
          setDob(userData.dob ?? "");
          setGender(userData.gender ?? "");
          setCountry(userData.country ?? "");
          setPlatform(userData.platform ?? "");
          if (userData.isAdmin === true) setIsAdmin(true);
        }
      } catch (error) {
        logger.error("Error fetching user data from Firestore:", error);
      }
    };

    void fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const openDatePicker = useCallback((): void => setShowDatePicker(true), []);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date): void => {
      setShowDatePicker(false);
      if (selectedDate) {
        setDob(selectedDate.toISOString().split("T")[0] ?? ""); // YYYY-MM-DD
      }
    },
    [],
  );

  const pickImage = useCallback(async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      ToastAndroid.show(t("settings.profile.messages.permissionMsg"), ToastAndroid.LONG);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0]?.uri ?? null);
    }
  }, [t]);

  const save = useCallback(async (): Promise<void> => {
    if (!currentUser) return;

    const missingField = firstMissingField({ name, dob, gender, country, platform });
    if (missingField) {
      ToastAndroid.show(t(MISSING_FIELD_MESSAGES[missingField]), ToastAndroid.LONG);
      return;
    }

    setIsSaving(true);
    try {
      let newPhotoURL: string | null;
      try {
        newPhotoURL = await uploadProfileImage(imageUri);
      } catch (error) {
        logger.error("Error uploading image:", error);
        ToastAndroid.show(t("settings.profile.messages.uploadFailed"), ToastAndroid.LONG);
        throw error;
      }

      // Update Firebase Auth profile (name + photo only).
      await currentUser.updateProfile({
        displayName: name,
        photoURL: newPhotoURL,
      });

      // Update the Firestore document (full profile data).
      await firestore().collection("users").doc(currentUser.uid).update({
        displayName: name,
        photoURL: newPhotoURL,
        dob,
        gender,
        country,
        platform,
      });

      refreshUser();
      setIsSaving(false);
      ToastAndroid.show(t("settings.profile.messages.saveSuccessMsg"), ToastAndroid.LONG);
    } catch (error) {
      setIsSaving(false);
      logger.error("Error saving profile:", error);
      ToastAndroid.show(t("settings.profile.messages.saveError"), ToastAndroid.LONG);
    }
  }, [currentUser, imageUri, name, dob, gender, country, platform, t, refreshUser]);

  return {
    name,
    setName,
    imageUri,
    setImageUri,
    dob,
    showDatePicker,
    openDatePicker,
    handleDateChange,
    gender,
    setGender,
    country,
    setCountry,
    platform,
    setPlatform,
    isSaving,
    isAdmin,
    pickImage,
    save,
  };
}
