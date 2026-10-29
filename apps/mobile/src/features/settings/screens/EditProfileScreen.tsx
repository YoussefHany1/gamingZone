import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import ErrorState from "@/src/components/ErrorState";
import LinkAccountModal from "@/src/features/linking/components/LinkAccountModal";
import { useDeferredReady } from "@/src/hooks/useDeferredReady";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
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
import DeleteAccountButton from "../components/editProfile/DeleteAccountButton";
import ReauthModal from "../components/editProfile/ReauthModal";
import { useCountryList } from "@/src/hooks/useCountryList";
import { useEditProfileForm } from "../hooks/useEditProfileForm";
import { useEmailVerification } from "../hooks/useEmailVerification";
import { useDeleteAccount } from "../hooks/useDeleteAccount";
import SkeletonProfile from "../skeleton/SkeletonProfile";
import PublicProfileEditorSection from "@/src/features/social/components/PublicProfileEditorSection";

function EditProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

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

  // Deletion leaves the app signed in as an anonymous guest; leave the profile
  // screen so the form no longer targets the deleted account.
  const handleAccountDeleted = useCallback((): void => {
    navigation.popToTop();
  }, [navigation]);

  const { confirmDeleteAccount, reauth } = useDeleteAccount({
    onDeleted: handleAccountDeleted,
  });

  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [forceReady, setForceReady] = useState<boolean>(false);

  const bottomInset = useBottomInset();
  const styles = useThemeStyles(
    (c) => ({
      container: { flex: 1, backgroundColor: c.background },
      subContainer: { padding: 20, paddingBottom: 0 },
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
    }),
    [bottomInset],
  );

  useEffect(() => {
    const timeout = setTimeout(() => setForceReady(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

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

  const openLinkModal = useCallback((): void => setShowLinkModal(true), []);
  const closeLinkModal = useCallback((): void => setShowLinkModal(false), []);

  if (!currentUser) {
    return <ErrorState message={t("common.loginRequired")} showContactButton={false} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {isSaving || (!isReady && !forceReady) ? (
        <SkeletonProfile />
      ) : (
        <ScrollView
          style={styles.subContainer}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
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

          <PublicProfileEditorSection uid={currentUser.uid} />

          <AdSlot visible={isReady || forceReady} marginVertical={30} />

          <TouchableOpacity onPress={save} style={styles.saveBtn}>
            <CustomText style={styles.saveText}>{t("common.saveChanges")}</CustomText>
          </TouchableOpacity>

          {isAdmin && <AdminDashboardPanel />}

          <DeleteAccountButton
            label={t("settings.deleteAccount.delete")}
            onPress={confirmDeleteAccount}
          />
        </ScrollView>
      )}

      <LinkAccountModal visible={showLinkModal} onClose={closeLinkModal} />

      <AvatarPickerModal
        visible={showAvatarPicker}
        onClose={closeAvatarPicker}
        currentUri={imageUri}
        onSelect={handleAvatarSelect}
        onUpload={handleAvatarUpload}
      />

      <ReauthModal
        visible={reauth.visible}
        method={reauth.method}
        password={reauth.password}
        errorMessage={reauth.errorMessage}
        isSubmitting={reauth.isSubmitting}
        showDiscordAlternative={reauth.showDiscordAlternative}
        onChangePassword={reauth.onChangePassword}
        onSubmitPassword={reauth.onSubmitPassword}
        onVerifyWithGoogle={reauth.onVerifyWithGoogle}
        onVerifyWithDiscord={reauth.onVerifyWithDiscord}
        onCancel={reauth.onCancel}
      />
    </SafeAreaView>
  );
}

export default EditProfileScreen;
