import React, { memo, useCallback, useState } from "react";
import { ActivityIndicator, Image, Switch, TextInput, ToastAndroid, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { uploadProfileImage } from "@/src/features/settings/lib/cloudinary";
import { logger } from "@/src/lib/logger";
import {
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_STATUS_MAX_LENGTH,
} from "@gaming-zone/core";
import { usePublicProfileEditor } from "../hooks/usePublicProfileEditor";

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

    const [uploadingBanner, setUploadingBanner] = useState<boolean>(false);

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
      banner: {
        width: "100%",
        height: 110,
        borderRadius: 12,
        backgroundColor: c.accentSurface,
      },
      bannerActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
      },
      smallButton: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.accentBorder,
        backgroundColor: c.accentSurface,
        paddingVertical: 10,
        alignItems: "center",
      },
      smallButtonText: {
        color: c.accentText,
        fontWeight: "600",
        fontSize: 13,
      },
      label: {
        color: c.textMuted,
        fontSize: 13,
        marginBottom: 6,
      },
      input: {
        color: c.text,
        backgroundColor: c.background,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
      },
      multiline: {
        minHeight: 90,
        textAlignVertical: "top",
      },
      handleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      at: {
        color: c.textMuted,
        fontSize: 16,
        fontWeight: "600",
      },
      claimButton: {
        borderRadius: 10,
        backgroundColor: c.accent,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
      },
      claimButtonText: {
        color: c.onAccent,
        fontWeight: "700",
        fontSize: 13,
      },
      statusRow: {
        flexDirection: "row",
        gap: 10,
      },
      emojiInput: {
        width: 64,
        textAlign: "center",
      },
      error: {
        color: c.danger,
        fontSize: 12,
        marginTop: 6,
      },
      switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      },
      switchCopy: { flex: 1 },
      switchTitle: {
        color: c.text,
        fontSize: 14,
        fontWeight: "600",
      },
      switchHint: {
        color: c.textMuted,
        fontSize: 12,
        marginTop: 2,
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

    const pickBanner = useCallback(async (): Promise<void> => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        ToastAndroid.show(t("settings.profile.messages.permissionMsg"), ToastAndroid.LONG);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.8,
      });

      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (!uri) return;

      setUploadingBanner(true);
      try {
        const url = await uploadProfileImage(uri);
        if (url) setBannerURL(url);
      } catch (error) {
        logger.error("[PublicProfileEditorSection] banner upload failed:", error);
        ToastAndroid.show(t("settings.profile.messages.uploadFailed"), ToastAndroid.LONG);
      } finally {
        setUploadingBanner(false);
      }
    }, [setBannerURL, t]);

    const handleSave = useCallback(async (): Promise<void> => {
      const success = await save();
      ToastAndroid.show(
        success
          ? t("social.profile.saveSuccess")
          : t("social.profile.saveError"),
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
          {draft.bannerURL && (
            <Image source={{ uri: draft.bannerURL }} style={styles.banner} resizeMode="cover" />
          )}
          <View>
            <CustomText style={styles.label}>{t("social.profile.banner")}</CustomText>
            <View style={styles.bannerActions}>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => void pickBanner()}
                disabled={uploadingBanner}
              >
                {uploadingBanner ? (
                  <ActivityIndicator color={colors.accentText} size="small" />
                ) : (
                  <CustomText style={styles.smallButtonText}>
                    {t("social.profile.changeBanner")}
                  </CustomText>
                )}
              </TouchableOpacity>
              {draft.bannerURL && (
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => setBannerURL(null)}
                >
                  <CustomText style={styles.smallButtonText}>
                    {t("social.profile.removeBanner")}
                  </CustomText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View>
            <CustomText style={styles.label}>{t("social.profile.handle")}</CustomText>
            <View style={styles.handleRow}>
              <CustomText style={styles.at}>@</CustomText>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={draft.handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                placeholder={t("social.profile.handlePlaceholder")}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => void claimDraftHandle()}
                disabled={claiming}
              >
                {claiming ? (
                  <ActivityIndicator color={colors.onAccent} size="small" />
                ) : (
                  <CustomText style={styles.claimButtonText}>
                    {t("social.profile.handleClaim")}
                  </CustomText>
                )}
              </TouchableOpacity>
            </View>
            {handleError && (
              <CustomText style={styles.error}>
                {t(`social.profile.handleErrors.${handleError}`)}
              </CustomText>
            )}
          </View>

          <View>
            <CustomText style={styles.label}>{t("social.profile.bio")}</CustomText>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={draft.bio}
              onChangeText={setBio}
              multiline
              maxLength={PROFILE_BIO_MAX_LENGTH}
              placeholder={t("social.profile.bioPlaceholder")}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View>
            <CustomText style={styles.label}>{t("social.profile.status")}</CustomText>
            <View style={styles.statusRow}>
              <TextInput
                style={[styles.input, styles.emojiInput]}
                value={draft.statusEmoji}
                onChangeText={setStatusEmoji}
                maxLength={8}
                placeholder="🎮"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={draft.statusText}
                onChangeText={setStatusText}
                maxLength={PROFILE_STATUS_MAX_LENGTH}
                placeholder={t("social.profile.statusPlaceholder")}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <CustomText style={styles.switchTitle}>
                {t("social.profile.privacy.discoverable")}
              </CustomText>
              <CustomText style={styles.switchHint}>
                {t("social.profile.privacy.discoverableHint")}
              </CustomText>
            </View>
            <Switch
              value={draft.privacy.discoverable}
              onValueChange={(value) => setPrivacy({ discoverable: value })}
              trackColor={{ true: colors.accentText, false: colors.border }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <CustomText style={styles.switchTitle}>
                {t("social.profile.privacy.showLinks")}
              </CustomText>
              <CustomText style={styles.switchHint}>
                {t("social.profile.privacy.showLinksHint")}
              </CustomText>
            </View>
            <Switch
              value={draft.privacy.showLinks}
              onValueChange={(value) => setPrivacy({ showLinks: value })}
              trackColor={{ true: colors.accentText, false: colors.border }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <CustomText style={styles.switchTitle}>
                {t("social.profile.privacy.showStats")}
              </CustomText>
              <CustomText style={styles.switchHint}>
                {t("social.profile.privacy.showStatsHint")}
              </CustomText>
            </View>
            <Switch
              value={draft.privacy.showStats}
              onValueChange={(value) => setPrivacy({ showStats: value })}
              trackColor={{ true: colors.accentText, false: colors.border }}
            />
          </View>

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
