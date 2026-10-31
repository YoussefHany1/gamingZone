import React from "react";
import {
  ActivityIndicator,
  Image,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import {
  HANDLE_MAX_LENGTH,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_STATUS_MAX_LENGTH,
} from "@gaming-zone/core";
import type { HandleSubmitError } from "../../hooks/usePublicProfileEditor";

function useFieldStyles() {
  return useThemeStyles((c) => ({
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
    inputGrow: { flex: 1 },
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
  }));
}

export type BannerFieldProps = {
  bannerURL: string | null;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
};

export function BannerField({
  bannerURL,
  uploading,
  onPick,
  onRemove,
}: BannerFieldProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useFieldStyles();

  return (
    <View>
      {bannerURL ? (
        <Image source={{ uri: bannerURL }} style={styles.banner} resizeMode="cover" />
      ) : null}
      <CustomText style={styles.label}>{t("social.profile.banner")}</CustomText>
      <View style={styles.bannerActions}>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={onPick}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.accentText} size="small" />
          ) : (
            <CustomText style={styles.smallButtonText}>
              {t("social.profile.changeBanner")}
            </CustomText>
          )}
        </TouchableOpacity>
        {bannerURL ? (
          <TouchableOpacity style={styles.smallButton} onPress={onRemove}>
            <CustomText style={styles.smallButtonText}>
              {t("social.profile.removeBanner")}
            </CustomText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export type HandleFieldProps = {
  value: string;
  claiming: boolean;
  error: HandleSubmitError | null;
  onChange: (value: string) => void;
  onClaim: () => void;
};

export function HandleField({
  value,
  claiming,
  error,
  onChange,
  onClaim,
}: HandleFieldProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useFieldStyles();

  return (
    <View>
      <CustomText style={styles.label}>{t("social.profile.handle")}</CustomText>
      <View style={styles.handleRow}>
        <CustomText style={styles.at}>@</CustomText>
        <TextInput
          style={[styles.input, styles.inputGrow]}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={HANDLE_MAX_LENGTH}
          placeholder={t("social.profile.handlePlaceholder")}
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity
          style={styles.claimButton}
          onPress={onClaim}
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
      {error ? (
        <CustomText style={styles.error}>
          {t(`social.profile.handleErrors.${error}`)}
        </CustomText>
      ) : null}
    </View>
  );
}

export type BioFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function BioField({ value, onChange }: BioFieldProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useFieldStyles();

  return (
    <View>
      <CustomText style={styles.label}>{t("social.profile.bio")}</CustomText>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={PROFILE_BIO_MAX_LENGTH}
        placeholder={t("social.profile.bioPlaceholder")}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

export type StatusFieldProps = {
  emoji: string;
  text: string;
  onChangeEmoji: (value: string) => void;
  onChangeText: (value: string) => void;
};

export function StatusField({
  emoji,
  text,
  onChangeEmoji,
  onChangeText,
}: StatusFieldProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useFieldStyles();

  return (
    <View>
      <CustomText style={styles.label}>{t("social.profile.status")}</CustomText>
      <View style={styles.statusRow}>
        <TextInput
          style={[styles.input, styles.emojiInput]}
          value={emoji}
          onChangeText={onChangeEmoji}
          maxLength={8}
          placeholder="🎮"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={[styles.input, styles.inputGrow]}
          value={text}
          onChangeText={onChangeText}
          maxLength={PROFILE_STATUS_MAX_LENGTH}
          placeholder={t("social.profile.statusPlaceholder")}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  );
}

export type PrivacyToggleProps = {
  title: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function PrivacyToggle({ title, hint, value, onChange }: PrivacyToggleProps) {
  const colors = useThemeColors();
  const styles = useFieldStyles();

  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <CustomText style={styles.switchTitle}>{title}</CustomText>
        <CustomText style={styles.switchHint}>{hint}</CustomText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accentText, false: colors.border }}
      />
    </View>
  );
}
