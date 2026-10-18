import React, { useCallback, useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import ErrorState from "@/src/components/ErrorState";
import SteamLinkModal from "@/src/components/SteamLinkModal";
import { useDeferredReady } from "@/src/hooks/useDeferredReady";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import AvatarPickerModal from "../components/AvatarPickerModal";
import AdSlot from "@/src/components/AdSlot";
import AdminDashboardPanel from "../components/editProfile/AdminDashboardPanel";
import EditProfileAvatar from "../components/editProfile/EditProfileAvatar";
import EmailVerificationCard from "../components/editProfile/EmailVerificationCard";
import ProfileCountryPicker from "../components/editProfile/ProfileCountryPicker";
import ProfileDobField from "../components/editProfile/ProfileDobField";
import ProfileGenderSelector from "../components/editProfile/ProfileGenderSelector";
import ProfileNameField from "../components/editProfile/ProfileNameField";
import ProfilePlatformSelector from "../components/editProfile/ProfilePlatformSelector";
import SteamSyncButton from "../components/editProfile/SteamSyncButton";
import { useCountryList } from "@/src/hooks/useCountryList";
import { useEditProfileForm } from "../hooks/useEditProfileForm";
import { useEmailVerification } from "../hooks/useEmailVerification";
import SkeletonProfile from "../skeleton/SkeletonProfile";

function EditProfileScreen(): React.ReactElement {
  const { t } = useTranslation();

  const currentUser = useAuthStore((state) => state.user);
  const isReady = useDeferredReady();
  const countriesList = useCountryList();

  const {
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
  } = useEditProfileForm();

  const { emailVerified, isChecking, sendVerificationEmail, refreshVerification } =
    useEmailVerification(currentUser);

  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);
  const [showSteamModal, setShowSteamModal] = useState<boolean>(false);

  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background, paddingBottom: 90 },
    subContainer: { padding: 20 },
    saveBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      alignSelf: "center",
      padding: 15,
      marginVertical: 20,
    },
    saveText: {
      color: c.onAccent,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "600",
    },
  }));

  const openAvatarPicker = useCallback((): void => setShowAvatarPicker(true), []);
  const closeAvatarPicker = useCallback((): void => setShowAvatarPicker(false), []);

  const handleAvatarSelect = useCallback(
    (uri: string): void => {
      setImageUri(uri);
      setShowAvatarPicker(false);
    },
    [setImageUri],
  );

  const handleAvatarUpload = useCallback((): void => {
    setShowAvatarPicker(false);
    void pickImage();
  }, [pickImage]);

  const openSteamModal = useCallback((): void => setShowSteamModal(true), []);
  const closeSteamModal = useCallback((): void => setShowSteamModal(false), []);

  if (!currentUser) {
    return <ErrorState message={t("common.loginRequired")} showContactButton={false} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {isSaving || !isReady ? (
        <SkeletonProfile />
      ) : (
        <ScrollView style={styles.subContainer}>
          <EditProfileAvatar imageUri={imageUri} onPress={openAvatarPicker} />

          <EmailVerificationCard
            emailVerified={emailVerified}
            isChecking={isChecking}
            onSendEmail={sendVerificationEmail}
            onRefresh={refreshVerification}
          />

          <ProfileNameField value={name} onChangeText={setName} />

          <ProfileDobField
            value={dob}
            isPickerVisible={showDatePicker}
            onOpenPicker={openDatePicker}
            onChange={handleDateChange}
          />

          <ProfileGenderSelector value={gender} onChange={setGender} />

          <ProfileCountryPicker
            options={countriesList}
            value={country}
            onChange={setCountry}
          />

          <ProfilePlatformSelector value={platform} onChange={setPlatform} />

          <AdSlot visible={isReady} marginVertical={30} />

          <SteamSyncButton onPress={openSteamModal} />

          <TouchableOpacity onPress={save} style={styles.saveBtn}>
            <CustomText style={styles.saveText}>{t("common.saveChanges")}</CustomText>
          </TouchableOpacity>

          {isAdmin && <AdminDashboardPanel />}
        </ScrollView>
      )}

      <SteamLinkModal visible={showSteamModal} onClose={closeSteamModal} />

      <AvatarPickerModal
        visible={showAvatarPicker}
        onClose={closeAvatarPicker}
        currentUri={imageUri}
        onSelect={handleAvatarSelect}
        onUpload={handleAvatarUpload}
      />
    </SafeAreaView>
  );
}

export default EditProfileScreen;
