import React, { memo, useCallback } from "react";
import { ActivityIndicator, ToastAndroid, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { usePublicProfileEditor } from "../hooks/usePublicProfileEditor";
import { useBannerUpload } from "../hooks/useBannerUpload";
import {
  BannerField,
  BioField,
  HandleField,
  PrivacyToggle,
  StatusField,
} from "./profileEditor/ProfileEditorFields";

export type PublicProfileEditorSectionProps = {
  uid: string;
};

/**
 * Discord-style personalisation for `profiles/{uid}`.
 *
 * Deliberately separate from the account form: these fields are the public
 * projection only, and saving them must not touch `users/{uid}` or the Auth
 * profile. The section renders nothing until the bootstrap request has created
 * the document, so a brand-new account never sees a form that cannot save.
 */
const PublicProfileEditorSection = memo(
  ({ uid }: PublicProfileEditorSectionProps): React.ReactElement | null => {
    const colors = useThemeColors();
    const { t } = useTranslation();
    const {
      draft,
      available,
      loading,
      saving,
      claiming,
      handleError,
      setHandle,
      setBannerURL,
      setBio,
      setStatusEmoji,
      setStatusText,
      setPrivacy,
      claimDraftHandle,
      save,
    } = usePublicProfileEditor(uid);
    const { uploading: uploadingBanner, pickBanner } = useBannerUpload(setBannerURL);

    const styles = useThemeStyles((c) => ({
      container: { marginTop: 24 },
      card: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        gap: 16,
      },
      saveButton: {
        borderRadius: 12,
        backgroundColor: c.accent,
        paddingVertical: 14,
        alignItems: "center",
      },
      saveButtonText: {
        color: c.onAccent,
        fontSize: 16,
        fontWeight: "700",
      },
    }));

    const handleSave = useCallback(async (): Promise<void> => {
      const success = await save();
      ToastAndroid.show(
        success ? t("social.profile.saveSuccess") : t("social.profile.saveError"),
        ToastAndroid.LONG,
      );
    }, [save, t]);

    if (!available) {
      if (!loading) return null;
      return (
        <View style={styles.container}>
          <ActivityIndicator color={colors.accentText} />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <SectionTitle
          title={t("social.profile.publicProfile")}
          subtitle={t("social.profile.publicProfileHint")}
        />
        <View style={styles.card}>
          <BannerField
            bannerURL={draft.bannerURL}
            uploading={uploadingBanner}
            onPick={() => void pickBanner()}
            onRemove={() => setBannerURL(null)}
          />
          <HandleField
            value={draft.handle}
            claiming={claiming}
            error={handleError}
            onChange={setHandle}
            onClaim={() => void claimDraftHandle()}
          />
          <BioField value={draft.bio} onChange={setBio} />
          <StatusField
            emoji={draft.statusEmoji}
            text={draft.statusText}
            onChangeEmoji={setStatusEmoji}
            onChangeText={setStatusText}
          />
          <PrivacyToggle
            title={t("social.profile.privacy.discoverable")}
            hint={t("social.profile.privacy.discoverableHint")}
            value={draft.privacy.discoverable}
            onChange={(value) => setPrivacy({ discoverable: value })}
          />
          <PrivacyToggle
            title={t("social.profile.privacy.showLinks")}
            hint={t("social.profile.privacy.showLinksHint")}
            value={draft.privacy.showLinks}
            onChange={(value) => setPrivacy({ showLinks: value })}
          />
          <PrivacyToggle
            title={t("social.profile.privacy.showStats")}
            hint={t("social.profile.privacy.showStatsHint")}
            value={draft.privacy.showStats}
            onChange={(value) => setPrivacy({ showStats: value })}
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <CustomText style={styles.saveButtonText}>
                {t("social.profile.savePublicProfile")}
              </CustomText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

PublicProfileEditorSection.displayName = "PublicProfileEditorSection";
export default PublicProfileEditorSection;
