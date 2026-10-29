import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import {
  createDefaultPrivacy,
  mapPublicProfile,
  profilePath,
  validateHandle,
  type HandleErrorCode,
  type ProfilePrivacy,
} from "@gaming-zone/core";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";
import {
  claimHandle,
  ensurePublicProfile,
  isHandleTakenError,
  updateMyPublicProfile,
} from "../lib/publicProfile";

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import arLocale from "i18n-iso-countries/langs/ar.json";

countries.registerLocale(enLocale);
countries.registerLocale(arLocale);

import { env } from "@/lib/env";

const CLOUDINARY_CLOUD_NAME = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const CLOUDINARY_UPLOAD_PRESET = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** Client-only handle errors the editor surfaces, on top of the shared rules. */
export type HandleSubmitError = HandleErrorCode | "taken" | "failed";

export function useProfile() {
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

  // --- Public profile (`profiles/{uid}`) -----------------------------------
  const [handle, setHandle] = useState("");
  const [claimedHandle, setClaimedHandle] = useState("");
  const [handleError, setHandleError] = useState<HandleSubmitError | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [bannerURL, setBannerURL] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("");
  const [statusText, setStatusText] = useState("");
  const [privacy, setPrivacyState] = useState<ProfilePrivacy>(createDefaultPrivacy);
  const [profileReady, setProfileReady] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Auth redirect handled by middleware
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;

    let cancelled = false;

    const applyProfile = (uid: string, data: Record<string, unknown> | undefined): void => {
      const mapped = mapPublicProfile(uid, data);
      if (!mapped) return;

      setHandle(mapped.handle);
      setClaimedHandle(mapped.handle);
      setBannerURL(mapped.bannerURL);
      setBio(mapped.bio);
      setStatusEmoji(mapped.status?.emoji ?? "");
      setStatusText(mapped.status?.text ?? "");
      setPrivacyState(mapped.privacy);
      setProfileReady(true);
    };

    const fetchUserData = async () => {
      const uid = currentUser.uid;
      const authDefaults = {
        name: currentUser.displayName ?? "",
        imageUri: currentUser.photoURL ?? null,
      };

      try {
        const [userDoc, profileDoc] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getDoc(doc(db, "profiles", uid)),
        ]);
        if (cancelled) return;

        let displayName = authDefaults.name;

        if (userDoc.exists()) {
          const data = userDoc.data();
          displayName = (data.displayName as string | undefined) ?? authDefaults.name;
          setName(displayName);
          setImageUri((data.photoURL as string | null | undefined) ?? authDefaults.imageUri);
          setDob((data.dob as string | undefined) ?? "");
          setGender((data.gender as string | undefined) ?? "");
          setCountry((data.country as string | undefined) ?? "");
          setPlatform((data.platform as string | undefined) ?? "");
        } else {
          setName(authDefaults.name);
          setImageUri(authDefaults.imageUri);
        }

        applyProfile(uid, profileDoc.exists() ? profileDoc.data() : undefined);

        // Accounts that pre-date Phase 1 (or a registration whose request was
        // unreachable) get their handle and profile here, then a fresh read.
        if (!profileDoc.exists()) {
          try {
            await ensurePublicProfile(uid, displayName);
            const fresh = await getDoc(doc(db, "profiles", uid));
            if (!cancelled && fresh.exists()) applyProfile(uid, fresh.data());
          } catch (bootstrapError) {
            console.warn("Public profile bootstrap skipped:", bootstrapError);
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        if (!cancelled) {
          setName(authDefaults.name);
          setImageUri(authDefaults.imageUri);
        }
      }
    };

    fetchUserData();

    return () => {
      cancelled = true;
    };
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

  const handlePickBanner = useCallback(() => {
    bannerInputRef.current?.click();
  }, []);

  const updateHandle = useCallback((value: string) => {
    setHandleError(null);
    setHandle(value);
  }, []);

  const handleBannerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }, []);

  const handleRemoveBanner = useCallback(() => {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerURL(null);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  }, []);

  const updatePrivacy = useCallback((patch: Partial<ProfilePrivacy>) => {
    setPrivacyState((current) => ({ ...current, ...patch }));
  }, []);

  const handleClaimHandle = useCallback(async () => {
    const validation = validateHandle(handle);
    if (!validation.ok) {
      setHandleError(validation.reason);
      return;
    }

    setClaiming(true);
    setHandleError(null);
    try {
      const claimed = await claimHandle(validation.handle);
      setHandle(claimed);
      setClaimedHandle(claimed);
      setProfileReady(true);
      toast.success(t("settings.profile.messages.saveSuccessMsg"));
    } catch (claimError) {
      console.error("Error claiming handle:", claimError);
      setHandleError(isHandleTakenError(claimError) ? "taken" : "failed");
    } finally {
      setClaiming(false);
    }
  }, [handle, t]);

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

      let newBannerURL = bannerURL;
      if (bannerFile) {
        newBannerURL = await uploadImage(bannerFile);
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

      // Mirror the account fields into the public projection and persist the
      // personalisation from this form. A missing document means bootstrap has
      // not run yet (Functions were unreachable), which must not lose the
      // account save — but once the document exists, a rejected update is a
      // real failure and is surfaced.
      let canWriteProfile = profileReady;
      if (!canWriteProfile) {
        try {
          await ensurePublicProfile(currentUser.uid, name);
          canWriteProfile = true;
        } catch (bootstrapError) {
          console.warn("Public profile bootstrap skipped:", bootstrapError);
        }
      }

      if (canWriteProfile) {
        const trimmedStatus = statusText.trim();
        await updateMyPublicProfile(currentUser.uid, {
          displayName: name,
          photoURL: newPhotoURL,
          platform,
          country,
          bannerURL: newBannerURL,
          bio,
          status: trimmedStatus ? { text: trimmedStatus, emoji: statusEmoji } : null,
          privacy,
        });

        setProfileReady(true);
        setBannerURL(newBannerURL);
        setBannerPreview(null);
        setBannerFile(null);
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
    bannerURL,
    bannerFile,
    bio,
    statusEmoji,
    statusText,
    privacy,
    profileReady,
    t,
    uploadImage,
    refreshUser,
  ]);

  const bannerPreviewUrl = bannerPreview ?? bannerURL;
  // `/u/{handle}` 404s for profiles that opted out of discovery, so the editor
  // only offers the link while the page actually resolves.
  const profileHref =
    claimedHandle && privacy.discoverable
      ? `/${lang}${profilePath(claimedHandle)}`
      : null;

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
    // Public profile
    handle,
    setHandle: updateHandle,
    claimedHandle,
    handleError,
    claiming,
    handleClaim: handleClaimHandle,
    bannerURL,
    bannerPreviewUrl,
    bannerInputRef,
    handlePickBanner,
    handleBannerChange,
    handleRemoveBanner,
    bio,
    setBio,
    statusEmoji,
    setStatusEmoji,
    statusText,
    setStatusText,
    privacy,
    updatePrivacy,
    profileReady,
    profileHref,
  };
}
