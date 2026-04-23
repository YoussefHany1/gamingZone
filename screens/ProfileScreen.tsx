import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  InteractionManager,
  TouchableOpacity,
  ToastAndroid,
} from "react-native";
import { Image } from "expo-image";
import { useState, useEffect, useMemo, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import firestore from "@react-native-firebase/firestore";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Loading from "../Loading";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
import Constants from "expo-constants";
import CustomPicker from "../components/CustomPicker";
import ErrorState from "../components/ErrorState";
import * as Updates from "expo-updates";
import countries from "i18n-iso-countries";
import enLang from "i18n-iso-countries/langs/en.json";
import arLang from "i18n-iso-countries/langs/ar.json";
import { PickerOption } from "../components/types";
import SteamLinkModal from "../components/SteamLinkModal";
import { Ionicons } from "@expo/vector-icons";
import SectionTitle from "../components/SectionTitle";
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

// Firestore user document type

interface FirestoreUser {
  displayName?: string;
  photoURL?: string;
  dob?: string;
  gender?: string;
  country?: string;
  platform?: string;
  isAdmin?: boolean;
}

// Cloudinary upload response

interface CloudinaryResponse {
  secure_url?: string;
  [key: string]: unknown;
}

// main

function ProfileScreen(): React.ReactElement {
  const [name, setName] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] =
    useState<FirebaseAuthTypes.User | null>(auth().currentUser);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [stats, setStats] = useState({ userCount: 0, newsCount: 0 });
  const [showAds, setShowAds] = useState<boolean>(false);
  const [showSteamModal, setShowSteamModal] = useState<boolean>(false);
  const { t, i18n } = useTranslation();

  // Defer ad rendering until after the main UI has settled
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  // Load profile data from Auth (fast) then Firestore (complete)
  useEffect(() => {
    if (!currentUser) return;

    setName(currentUser.displayName ?? "");
    setImageUri(currentUser.photoURL ?? null);

    const fetchUserData = async (): Promise<void> => {
      try {
        const userDocument = await firestore()
          .collection("users")
          .doc(currentUser.uid)
          .get();

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
  }, [currentUser]);

  useEffect(() => {
    if (isAdmin) {
      const fetchStats = async () => {
        const usersSnap = await firestore().collection("users").count().get();
        const newsSnap = await firestore().collection("news").count().get(); // افترضت وجود collection باسم news
        setStats({
          userCount: usersSnap.data().count,
          newsCount: newsSnap.data().count,
        });
      };
      fetchStats();
    }
  }, [isAdmin]);

  const pickImage = useCallback(async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      ToastAndroid.show(
        t("settings.profile.messages.permissionMsg"),
        ToastAndroid.LONG,
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
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
        ToastAndroid.show(
          t("settings.profile.messages.uploadFailed"),
          ToastAndroid.LONG,
        );
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
      ToastAndroid.show(t("settings.profile.messages.missingPlatform"), ToastAndroid.LONG);
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

      setCurrentUser(auth().currentUser);
      setLoading(false);
      ToastAndroid.show(
        t("settings.profile.messages.saveSuccessMsg"),
        ToastAndroid.LONG,
      );
    } catch (error) {
      setLoading(false);
      console.error("Error saving profile:", error);
      ToastAndroid.show(
        t("settings.profile.messages.saveError"),
        ToastAndroid.LONG,
      );
    }
  }, [currentUser, imageUri, name, dob, gender, country, platform, t, uploadImage]);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date): void => {
      setShowPicker(false);
      if (selectedDate) {
        setDob(selectedDate.toISOString().split("T")[0]); // YYYY-MM-DD
      }
    },
    [],
  );

  const genderOptions: PickerOption[] = useMemo(
    () => [
      { label: t("auth.register.male") || "Male", value: "male" },
      { label: t("auth.register.female") || "Female", value: "female" },
    ],
    [t],
  );

  // Build localised, sorted country list — recomputed only when language changes
  const countriesList: PickerOption[] = useMemo(() => {
    const langCode = i18n.language.startsWith("ar") ? "ar" : "en";
    const countriesObj = countries.getNames(langCode, { select: "official" });
    const excluded = new Set(["IL"]);

    return Object.entries(countriesObj)
      .filter(([code]) => !excluded.has(code))
      .map(([code, name]) => ({ label: name, value: code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [i18n.language]);

  const platformOptions: PickerOption[] = useMemo(
    () => [
      { label: "", value: "" },
      { label: t("settings.profile.platforms.pc") || "PC", value: "pc" },
      {
        label: t("settings.profile.platforms.playstation") || "PlayStation",
        value: "playstation",
      },
      { label: t("settings.profile.platforms.xbox") || "Xbox", value: "xbox" },
      {
        label: t("settings.profile.platforms.android") || "Android",
        value: "android",
      },
      { label: t("settings.profile.platforms.ios") || "iOS", value: "ios" },
    ],
    [t],
  );

  if (!currentUser) return <ErrorState message={t("common.loginRequired")} showContactButton={false} />;

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {loading ? (
        <Loading />
      ) : (
        <ScrollView style={styles.subContainer}>
          {/* Avatar */}
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <Image
              recyclingKey={imageUri ?? ""}
              style={styles.avatar}
              source={
                imageUri ? imageUri : require("../assets/default_profile.webp")
              }
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling
            />
            <Text style={styles.changePicText}>
              {t("settings.profile.changePic")}
            </Text>
          </TouchableOpacity>

          {/* Name */}
          <SectionTitle title={t("settings.profile.nameLabel")} />
          <TextInput
            style={styles.input}
            placeholder={t("settings.profile.placeholders.name")}
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />

          {/* Date of Birth */}
          <SectionTitle title={t("settings.profile.dobLabel")} />
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <TextInput
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
          <CustomPicker
            options={genderOptions}
            selectedValue={gender}
            onValueChange={setGender}
            placeholder={
              t("settings.profile.placeholders.gender") || "Select Gender"
            }
          />

          {/* Country */}
          <SectionTitle title={t("settings.profile.countryLabel")} />
          <CustomPicker
            options={countriesList}
            selectedValue={country}
            onValueChange={setCountry}
            placeholder={
              t("settings.profile.placeholders.country") || "Select Country"
            }
          />

          {/* Platform */}
          <SectionTitle title={t("settings.profile.platformLabel")} />
          <CustomPicker
            options={platformOptions}
            selectedValue={platform}
            onValueChange={setPlatform}
            placeholder={
              t("settings.profile.placeholders.platform") || "Select Platform"
            }
          />

          {showAds && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>
          )}

          {/* Sync Steam Library Button */}
          <SectionTitle title={t("settings.profile.connectedApps")} />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#171a21', marginTop: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => setShowSteamModal(true)}
          >
            <Ionicons name="logo-steam" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.saveText}>{t("settings.profile.steam.modal.title") || "Sync Steam Library"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>{t("common.saveChanges")}</Text>
          </TouchableOpacity>

          {/* Admin dashboard — only visible to admin users */}
          {isAdmin && (
            <View style={{ backgroundColor: "gold", padding: 15, margin: 20 }}>
              <Text>Admin Dashboard 👑</Text>
              <Text>📢 Channel: {Updates.channel ?? "Not Defined"}</Text>
              <Text>
                ⚙️ Runtime Version: {Updates.runtimeVersion ?? "Not Defined"}
              </Text>
              <Text>
                🆔 Update ID: {Updates.updateId ?? "Running Native Build"}
              </Text>
              <Text>
                📦 App Config Version:{" "}
                {(require("../app.json") as { expo: { version: string } }).expo
                  .version}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <SteamLinkModal
        visible={showSteamModal}
        onClose={() => setShowSteamModal(false)}
      />
    </SafeAreaView>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
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
});
