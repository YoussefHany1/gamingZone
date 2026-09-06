import CustomText from "@/src/components/CustomText";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
} from "react-native";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { Image } from "expo-image";
import { useState, useEffect, useMemo, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import firestore from "@react-native-firebase/firestore";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import SkeletonProfile from "../skeleton/SkeletonProfile";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import COLORS from "@/src/constants/colors";
import { adUnitId } from "@/src/constants/config";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useShallow } from "zustand/react/shallow";
import Constants from "expo-constants";
import CustomPicker from "@/src/components/CustomPicker";
import ErrorState from "@/src/components/ErrorState";
import * as Updates from "expo-updates";
import countries from "i18n-iso-countries";
import enLang from "i18n-iso-countries/langs/en.json";
import arLang from "i18n-iso-countries/langs/ar.json";
import { PickerOption } from "@/src/types/sharedTypes";
import SteamLinkModal from "../components/SteamLinkModal";
import { Mars, Monitor, Venus } from "lucide-react-native";
import { AndroidIcon, AppleIcon, PlayStationIcon, XboxIcon } from "@/src/components/icons/BrandIcons";
import { SteamIcon } from "@/src/components/icons/StoreIcons";
import SectionTitle from "@/src/components/SectionTitle";
import { FirestoreUser, CloudinaryResponse } from "../types";
import CustomTextInput from "@/src/components/CustomTextInput";

// Cloudinary config

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

countries.registerLocale(enLang);
countries.registerLocale(arLang);

// main

function ProfileScreen(): React.ReactElement {
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
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAds, setShowAds] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [showSteamModal, setShowSteamModal] = useState<boolean>(false);
  const { t, i18n } = useTranslation();

  // Defer ad rendering until after the main UI has settled
  useEffect(() => {
    const task = runAfterInteractions(() => {
      setShowAds(true);
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Load profile data from Auth (fast) then Firestore (complete)
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
        console.error("Error fetching user data from Firestore:", error);
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

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

    if (!result.canceled) {
      if (result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0]?.uri ?? null);
      }
    }
  }, [t]);

  // Upload image to Cloudinary; returns the original URI unchanged if it's already a remote URL
  const uploadImage = useCallback(
    async (uri: string | null): Promise<string | null> => {
      if (!uri || !uri.startsWith("file://")) return uri;

      const data = new FormData();
      data.append("file", {
        uri,
        type: `image/${uri.split(".").pop()}`,
        name: `profile.${uri.split(".").pop()}`,
      } as unknown as Blob);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("api_key", CLOUDINARY_API_KEY);

      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      try {
        const response = await fetch(url, {
          method: "POST",
          body: data,
          headers: { "Content-Type": "multipart/form-data" },
        });

        const json: CloudinaryResponse = await response.json();

        if (json.secure_url) {
          return json.secure_url;
        } else {
          console.error("Cloudinary error:", json);
          throw new Error("Image upload failed.");
        }
      } catch (e) {
        console.error("Error uploading image:", e);
        ToastAndroid.show(t("settings.profile.messages.uploadFailed"), ToastAndroid.LONG);
        throw e;
      }
    },
    [t],
  );

  const handleSave = useCallback(async (): Promise<void> => {
    if (!currentUser) return;

    // Validate all required fields
    if (!name.trim()) {
      ToastAndroid.show(t("settings.profile.messages.missingName"), ToastAndroid.LONG);
      return;
    }
    if (!dob) {
      ToastAndroid.show(t("settings.profile.messages.missingDob"), ToastAndroid.LONG);
      return;
    }
    if (!gender) {
      ToastAndroid.show(t("settings.profile.messages.missingGender"), ToastAndroid.LONG);
      return;
    }
    if (!country) {
      ToastAndroid.show(t("settings.profile.messages.missingCountry"), ToastAndroid.LONG);
      return;
    }
    if (!platform) {
      ToastAndroid.show(
        t("settings.profile.messages.missingPlatform"),
        ToastAndroid.LONG,
      );
      return;
    }

    setLoading(true);
    try {
      const newPhotoURL = await uploadImage(imageUri);

      // Update Firebase Auth profile (name + photo only)
      await currentUser.updateProfile({
        displayName: name,
        photoURL: newPhotoURL,
      });

      // Update Firestore document (full profile data)
      await firestore().collection("users").doc(currentUser.uid).update({
        displayName: name,
        photoURL: newPhotoURL,
        dob,
        gender,
        country,
        platform,
      });

      refreshUser();
      setLoading(false);
      ToastAndroid.show(t("settings.profile.messages.saveSuccessMsg"), ToastAndroid.LONG);
    } catch (error) {
      setLoading(false);
      console.error("Error saving profile:", error);
      ToastAndroid.show(t("settings.profile.messages.saveError"), ToastAndroid.LONG);
    }
  }, [currentUser, imageUri, name, dob, gender, country, platform, t, uploadImage]);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date): void => {
      setShowPicker(false);
      if (selectedDate) {
        setDob(selectedDate.toISOString().split("T")[0] ?? ""); // YYYY-MM-DD
      }
    },
    [],
  );

  // Build localised, sorted country list â€” recomputed only when language changes
  const countriesList: PickerOption[] = useMemo(() => {
    const langCode = i18n.language.startsWith("ar") ? "ar" : "en";
    const countriesObj = countries.getNames(langCode, { select: "official" });
    const excluded = new Set(["IL"]);

    return Object.entries(countriesObj)
      .filter(([code]) => !excluded.has(code))
      .map(([code, name]) => ({ label: name, value: code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [i18n.language]);

  if (!currentUser)
    return <ErrorState message={t("common.loginRequired")} showContactButton={false} />;

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {loading || !isReady ? (
        <SkeletonProfile />
      ) : (
        <ScrollView style={styles.subContainer}>
          {/* Avatar */}
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <Image
              recyclingKey={imageUri ?? ""}
              style={styles.avatar}
              source={imageUri ? imageUri : require("@/assets/default_profile.webp")}
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling
            />
            <CustomText style={styles.changePicText}>
              {t("settings.profile.changePic")}
            </CustomText>
          </TouchableOpacity>

          {/* Email verification */}
          {!currentUser.emailVerified && (
            <View style={styles.verifyContainer}>
              <TouchableOpacity
                style={styles.verifyBox}
                onPress={async () => {
                  try {
                    await currentUser.sendEmailVerification();
                    ToastAndroid.show(
                      t("auth.verificationEmailSent"),
                      ToastAndroid.LONG,
                    );
                  } catch (e) {
                    console.error("Failed to send verification email:", e);
                    ToastAndroid.show(
                      t("settings.profile.messages.saveError"),
                      ToastAndroid.LONG,
                    );
                  }
                }}
              >
                <CustomText style={styles.verifyText}>
                  {t("auth.emailNotVerified")}
                </CustomText>
                <CustomText style={styles.verifyAction}>
                  {t("auth.verifyEmail")}
                </CustomText>
              </TouchableOpacity>
            </View>
          )}
          {currentUser.emailVerified && (
            <View style={[styles.verifyContainer, styles.verifyBoxVerified]}>
              <CustomText style={styles.verifyText}>
                {t("auth.emailVerified")}
              </CustomText>
            </View>
          )}

          {/* Name */}
          <SectionTitle title={t("settings.profile.nameLabel")} />
          <CustomTextInput
            style={styles.input}
            placeholder={t("settings.profile.placeholders.name")}
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />

          {/* Date of Birth */}
          <SectionTitle title={t("settings.profile.dobLabel")} />
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <CustomTextInput
              style={styles.input}
              placeholder={t("settings.profile.placeholders.dob")}
              placeholderTextColor="#888"
              value={dob}
              editable={false}
            />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              mode="date"
              display="default"
              value={dob ? new Date(dob) : new Date()}
              onChange={handleDateChange}
            />
          )}

          {/* Gender */}
          <SectionTitle title={t("settings.profile.genderLabel")} />
          <View style={styles.platformContainer}>
            {[
              {
                id: "male",
                icon: Mars,
                label: t("auth.register.male") || "Male",
              },
              {
                id: "female",
                icon: Venus,
                label: t("auth.register.female") || "Female",
              },
            ].map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.platformButton,
                  { minWidth: "45%" },
                  gender === g.id && styles.platformButtonSelected,
                ]}
                onPress={() => setGender(g.id)}
                activeOpacity={0.7}
              >
                <g.icon
                  size={32}
                  color={gender === g.id ? "#fff" : COLORS.lightGray}
                />
                <CustomText
                  style={[
                    styles.platformText,
                    gender === g.id && styles.platformTextSelected,
                  ]}
                >
                  {g.label}
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Country */}
          <SectionTitle title={t("settings.profile.countryLabel")} />
          <CustomPicker
            options={countriesList}
            selectedValue={country}
            onValueChange={setCountry}
            placeholder={t("settings.profile.placeholders.country") || "Select Country"}
          />

          {/* Platform */}
          <SectionTitle title={t("settings.profile.platformLabel")} />
          <View style={styles.platformContainer}>
            {[
              {
                id: "pc",
                icon: Monitor,
                label: t("settings.profile.platforms.pc") || "PC",
              },
              {
                id: "playstation",
                icon: PlayStationIcon,
                label: t("settings.profile.platforms.playstation") || "PlayStation",
              },
              {
                id: "xbox",
                icon: XboxIcon,
                label: t("settings.profile.platforms.xbox") || "Xbox",
              },
              {
                id: "android",
                icon: AndroidIcon,
                label: t("settings.profile.platforms.android") || "Android",
              },
              {
                id: "ios",
                icon: AppleIcon,
                label: t("settings.profile.platforms.ios") || "iOS",
              },
            ].map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.platformButton,
                  platform === p.id && styles.platformButtonSelected,
                ]}
                onPress={() => setPlatform(p.id)}
                activeOpacity={0.7}
              >
                {p.icon === Monitor ? (
                  <p.icon
                    size={32}
                    color={platform === p.id ? "#fff" : COLORS.lightGray}
                  />
                ) : (
                  <p.icon
                    size={32}
                    fill={platform === p.id ? "#fff" : COLORS.lightGray}
                  />
                )}
                <CustomText
                  style={[
                    styles.platformText,
                    platform === p.id && styles.platformTextSelected,
                  ]}
                >
                  {p.label}
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>

          {showAds && (
            <View style={styles.ad}>
              <CustomText style={styles.adText}>{t("common.ad")}</CustomText>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>
          )}

          {/* Sync Steam Library Button */}
          <SectionTitle title={t("settings.profile.connectedApps")} />
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: "#171a21",
                marginTop: 10,
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
            onPress={() => setShowSteamModal(true)}
          >
            <View style={{ marginRight: 10 }}>
              <SteamIcon size={24} fill="#fff" />
            </View>
            <CustomText style={styles.saveText}>
              {t("settings.profile.steam.modal.title") || "Sync Steam Library"}
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <CustomText style={styles.saveText}>{t("common.saveChanges")}</CustomText>
          </TouchableOpacity>

          {/* Admin dashboard â€” only visible to admin users */}
          {isAdmin && (
            <View style={{ backgroundColor: "gold", padding: 15, margin: 20 }}>
              <CustomText>Admin Dashboard</CustomText>
              <CustomText>Channel: {Updates.channel ?? "Not Defined"}</CustomText>
              <CustomText>
                Runtime Version: {Updates.runtimeVersion ?? "Not Defined"}
              </CustomText>
              <CustomText>
                Update ID: {Updates.updateId ?? "Running Native Build"}
              </CustomText>
              <CustomText>
                App Config Version:{" "}
                {(require("@/app.json") as { expo: { version: string } }).expo.version}
              </CustomText>
            </View>
          )}
        </ScrollView>
      )}

      <SteamLinkModal visible={showSteamModal} onClose={() => setShowSteamModal(false)} />
    </SafeAreaView>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary, paddingBottom: 90 },
  subContainer: { padding: 20 },
  avatarContainer: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#333",
    borderWidth: 2,
    borderColor: "#779bdd",
  },
  changePicText: { color: "#779bdd", marginTop: 10, fontSize: 16 },
  verifyContainer: { marginBottom: 20 },
  verifyBox: {
    backgroundColor: "rgba(255, 193, 7, 0.15)",
    borderColor: "#ffc107",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  verifyBoxVerified: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    borderColor: "#4caf50",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  verifyText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  verifyAction: {
    color: "#ffc107",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
    textDecorationLine: "underline",
  },
  input: {
    width: "100%",
    backgroundColor: COLORS.button,
    color: "#fff",
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 16,
  },
  label: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: "white" },
  saveBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    alignSelf: "center",
    padding: 15,
    marginVertical: 20,
  },
  saveText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  ad: { alignItems: "center", width: "100%", marginVertical: 30 },
  adText: { color: "#fff", marginBottom: 10 },
  platformContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 20,
    gap: 10,
  },
  platformButton: {
    width: "30%",
    backgroundColor: "rgba(119, 155, 221, 0.1)",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  platformButtonSelected: {
    backgroundColor: "rgba(119, 155, 221, 0.3)",
    borderColor: COLORS.secondary,
  },
  platformText: {
    color: COLORS.lightGray,
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  platformTextSelected: {
    color: "#fff",
  },
});
