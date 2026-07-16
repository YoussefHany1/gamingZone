import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import arLocale from "i18n-iso-countries/langs/ar.json";

countries.registerLocale(enLocale);
countries.registerLocale(arLocale);

import { env } from "@/lib/env";

const CLOUDINARY_CLOUD_NAME = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const CLOUDINARY_UPLOAD_PRESET = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function useProfile() {
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

  // Auth redirect handled by middleware
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
    const names = countries.getNames(lang === "ar" ? "ar" : "en", { select: "official" });
    return Object.entries(names)
      .filter(([code]) => code !== "IL")
      .map(([code, label]) => ({ code, label: label as string }))
      .sort((a, b) => a.label.localeCompare(b.label, lang === "ar" ? "ar" : "en"));
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
    [],
  );

  const uploadImage = useCallback(async (file: File): Promise<string> => {
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
  }, []);

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

      if (imageFile) {
        newPhotoURL = await uploadImage(imageFile);
      }

      await updateProfile(currentUser, {
        displayName: name,
        photoURL: newPhotoURL,
      });

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

      toast.success(t("settings.profile.messages.saveSuccessMsg") || "Profile saved successfully");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      const errorMsg = t("settings.profile.messages.saveError");
      setError(errorMsg);
      toast.error(errorMsg || "An error occurred while saving");
    } finally {
      setSaving(false);
    }
  }, [
    currentUser,
    imageUri,
    imageFile,
    name,
    dob,
    gender,
    country,
    platform,
    t,
    uploadImage,
    refreshUser,
  ]);

  return {
    t,
    isLoading,
    currentUser,
    name,
    setName,
    imageUri,
    dob,
    setDob,
    gender,
    setGender,
    country,
    setCountry,
    platform,
    setPlatform,
    saving,
    success,
    error,
    fileInputRef,
    countriesList,
    handlePickImage,
    handleFileChange,
    handleSave,
  };
}
