"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useAuthStore } from "../../store/useAuthStore";
import { useLangStore } from "../../store/useLangStore";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  User,
  Calendar,
  Globe,
  Monitor,
  Camera,
  Save,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const CLOUDINARY_API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

// Country list
const COUNTRIES_EN: Record<string, string> = {
  SA: "Saudi Arabia", AE: "United Arab Emirates", EG: "Egypt", IQ: "Iraq",
  JO: "Jordan", KW: "Kuwait", LB: "Lebanon", LY: "Libya", MA: "Morocco",
  OM: "Oman", PS: "Palestine", QA: "Qatar", SD: "Sudan", SY: "Syria",
  TN: "Tunisia", YE: "Yemen", BH: "Bahrain", DZ: "Algeria", MR: "Mauritania",
  SO: "Somalia", DJ: "Djibouti", KM: "Comoros",
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  CA: "Canada", AU: "Australia", TR: "Turkey", BR: "Brazil", IN: "India",
  JP: "Japan", KR: "South Korea", IT: "Italy", ES: "Spain", NL: "Netherlands",
  SE: "Sweden", NO: "Norway", PL: "Poland", RU: "Russia", MX: "Mexico",
};
const COUNTRIES_AR: Record<string, string> = {
  SA: "السعودية", AE: "الإمارات", EG: "مصر", IQ: "العراق",
  JO: "الأردن", KW: "الكويت", LB: "لبنان", LY: "ليبيا", MA: "المغرب",
  OM: "عُمان", PS: "فلسطين", QA: "قطر", SD: "السودان", SY: "سوريا",
  TN: "تونس", YE: "اليمن", BH: "البحرين", DZ: "الجزائر", MR: "موريتانيا",
  SO: "الصومال", DJ: "جيبوتي", KM: "جزر القمر",
  US: "الولايات المتحدة", GB: "المملكة المتحدة", DE: "ألمانيا", FR: "فرنسا",
  CA: "كندا", AU: "أستراليا", TR: "تركيا", BR: "البرازيل", IN: "الهند",
  JP: "اليابان", KR: "كوريا الجنوبية", IT: "إيطاليا", ES: "إسبانيا", NL: "هولندا",
  SE: "السويد", NO: "النرويج", PL: "بولندا", RU: "روسيا", MX: "المكسيك",
};

export default function ProfilePage() {
  const router = useRouter();
  const { t, lang } = useLangStore();
  const currentUser = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [platform, setPlatform] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect anonymous users to auth
  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.isAnonymous)) {
      router.push("/auth/login");
    }
  }, [currentUser, isLoading, router]);

  // Load profile data from Firestore
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;

    setName(currentUser.displayName ?? "");
    setImageUri(currentUser.photoURL ?? null);

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.displayName ?? "");
          setImageUri(data.photoURL ?? null);
          setDob(data.dob ?? "");
          setGender(data.gender ?? "");
          setCountry(data.country ?? "");
          setPlatform(data.platform ?? "");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const countriesList = useMemo(() => {
    const source = lang === "ar" ? COUNTRIES_AR : COUNTRIES_EN;
    return Object.entries(source)
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [lang]);

  const handlePickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setImageFile(file);
        setImageUri(URL.createObjectURL(file));
      }
    },
    []
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("api_key", CLOUDINARY_API_KEY);

      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const response = await fetch(url, { method: "POST", body: data });
      const json = await response.json();

      if (json.secure_url) {
        return json.secure_url;
      }
      throw new Error("Image upload failed");
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!currentUser) return;
    setError("");
    setSuccess(false);

    if (!name.trim()) {
      setError(t("settings.profile.messages.missingName"));
      return;
    }

    setSaving(true);
    try {
      let newPhotoURL = imageUri;

      // Upload new image if a file was selected
      if (imageFile) {
        newPhotoURL = await uploadImage(imageFile);
      }

      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: name,
        photoURL: newPhotoURL,
      });

      // Update Firestore document (upsert)
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);

      const profileData = {
        displayName: name,
        photoURL: newPhotoURL,
        dob,
        gender,
        country,
        platform,
      };

      if (userDoc.exists()) {
        await updateDoc(userRef, profileData);
      } else {
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          createdAt: new Date(),
          ...profileData,
        });
      }

      refreshUser();
      setSuccess(true);
      setImageFile(null);

      // Auto-hide success after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(t("settings.profile.messages.saveError"));
    } finally {
      setSaving(false);
    }
  }, [
    currentUser, imageUri, imageFile, name, dob, gender, country, platform, t, uploadImage, refreshUser,
  ]);

  const selectStyles =
    "w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300 appearance-none cursor-pointer";

  if (isLoading || !currentUser || currentUser.isAnonymous) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-light-blue border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page Title */}
          <h1 className="text-3xl font-bold mb-8 text-center">
            {t("navigation.titles.accountSettings")}
          </h1>

          <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-8">
              <button
                onClick={handlePickImage}
                className="relative group"
              >
                <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-light-blue/50 shadow-lg shadow-light-blue/10">
                  {imageUri ? (
                    <img
                      src={imageUri}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-light-blue to-secondary-blue flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {name ? name[0].toUpperCase() : "G"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-7 h-7 text-white" />
                </div>
              </button>
              <p className="mt-3 text-sm text-light-blue">
                {t("settings.profile.changePic")}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Success */}
            {success && (
              <div className="mb-6 p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-sm text-center flex items-center justify-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 className="w-5 h-5" />
                {t("settings.profile.messages.saveSuccessMsg")}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center animate-in fade-in duration-300">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                  <User className="w-4 h-4 text-light-blue" />
                  {t("settings.profile.nameLabel")}
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("settings.profile.placeholders.name")}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 text-light-blue" />
                  {t("settings.profile.dobLabel")}
                </label>
                <input
                  id="profile-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300 [color-scheme:dark]"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                  {t("settings.profile.genderLabel")}
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <select
                    id="profile-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={selectStyles}
                    style={!gender ? { color: "rgb(107 114 128)" } : undefined}
                  >
                    <option value="" disabled>
                      {t("settings.profile.placeholders.gender")}
                    </option>
                    <option value="male">{t("auth.register.male")}</option>
                    <option value="female">{t("auth.register.female")}</option>
                  </select>
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                  <Globe className="w-4 h-4 text-light-blue" />
                  {t("settings.profile.countryLabel")}
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <select
                    id="profile-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={selectStyles}
                    style={!country ? { color: "rgb(107 114 128)" } : undefined}
                  >
                    <option value="" disabled>
                      {t("settings.profile.placeholders.country")}
                    </option>
                    {countriesList.map(({ code, label }) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                  <Monitor className="w-4 h-4 text-light-blue" />
                  {t("settings.profile.platformLabel")}
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <select
                    id="profile-platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className={selectStyles}
                    style={!platform ? { color: "rgb(107 114 128)" } : undefined}
                  >
                    <option value="" disabled>
                      {t("settings.profile.placeholders.platform")}
                    </option>
                    <option value="pc">{t("settings.profile.platforms.pc")}</option>
                    <option value="playstation">
                      {t("settings.profile.platforms.playstation")}
                    </option>
                    <option value="xbox">{t("settings.profile.platforms.xbox")}</option>
                    <option value="android">
                      {t("settings.profile.platforms.android")}
                    </option>
                    <option value="ios">{t("settings.profile.platforms.ios")}</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <button
                id="profile-save"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-bold text-white shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {t("common.saveChanges")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
