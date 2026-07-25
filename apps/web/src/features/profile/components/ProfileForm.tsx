import React, { useEffect } from "react";
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
import { useProfile } from "../hooks/useProfile";
import { useRouter } from "next/navigation";
import { useLangStore } from "@/store/useLangStore";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Image from "next/image";

export default function ProfileForm() {
  const router = useRouter();
  const { lang } = useLangStore();
  const {
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
  } = useProfile();

  // Redirect to login if not authenticated after loading completes
  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.isAnonymous)) {
      router.replace(`/${lang}/auth/login`);
    }
  }, [isLoading, currentUser, router, lang]);

  if (isLoading || !currentUser || currentUser.isAnonymous) {
    return (
      <>
        <main className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </>
    );
  }

  const selectStyles =
    "w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300 appearance-none cursor-pointer";

  return (
    <>
      <main className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page Title */}
          <h1 className="text-3xl font-bold mb-8 text-center">
            {t("navigation.titles.accountSettings")}
          </h1>

          <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-8">
              <button onClick={handlePickImage} className="relative group">
                <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-light-blue/50 shadow-lg shadow-light-blue/10">
                  {imageUri ? (
                    <Image
                      src={imageUri}
                      alt="Profile"
                      width={112}
                      height={112}
                      priority
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-tr from-light-blue to-secondary-blue flex items-center justify-center">
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
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300 scheme-dark"
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
                    style={
                      !platform ? { color: "rgb(107 114 128)" } : undefined
                    }
                  >
                    <option value="" disabled>
                      {t("settings.profile.placeholders.platform")}
                    </option>
                    <option value="pc">
                      {t("settings.profile.platforms.pc")}
                    </option>
                    <option value="playstation">
                      {t("settings.profile.platforms.playstation")}
                    </option>
                    <option value="xbox">
                      {t("settings.profile.platforms.xbox")}
                    </option>
                    <option value="android">
                      {t("settings.profile.platforms.android")}
                    </option>
                    <option value="ios">
                      {t("settings.profile.platforms.ios")}
                    </option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <button
                id="profile-save"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-linear-to-r from-secondary-blue to-light-blue font-bold text-white shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </>
  );
}
