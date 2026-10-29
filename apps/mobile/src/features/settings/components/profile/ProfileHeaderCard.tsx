import React, { memo, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import {
  AndroidIcon,
  AppleIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { NintendoSwitchIcon } from "@/src/components/icons/StoreIcons";
import { Monitor } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { flagEmoji } from "@/src/lib/flagEmoji";
import type { ProfileHeaderCardProps } from "./types";

/**
 * The profile identity card: banner, avatar, name, @handle, status, bio, and the
 * meta row (preferred platform, join date, country flag). Anything the account
 * has not set is simply left out.
 */
const ProfileHeaderCard = memo(
  ({
    displayName,
    photoURL,
    memberSince,
    platform,
    country,
    handle,
    bannerURL,
    bio,
    status,
    onEditProfile,
  }: ProfileHeaderCardProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      headerCard: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        overflow: "hidden",
        marginBottom: 24,
      },
      banner: {
        width: "100%",
        height: 104,
        backgroundColor: c.accentSurface,
      },
      bannerFallback: {
        height: 64,
        backgroundColor: c.accentSurface,
      },
      body: {
        paddingHorizontal: 16,
        paddingBottom: 16,
      },
      identityRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 14,
        marginTop: -30,
      },
      avatar: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: c.skeletonBase,
        borderWidth: 3,
        borderColor: c.surface,
      },
      nameBlock: {
        flex: 1,
        paddingBottom: 4,
      },
      nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      name: {
        color: c.text,
        fontSize: 20,
        fontWeight: "700",
      },
      handle: {
        color: c.textMuted,
        fontSize: 13,
        marginTop: 2,
      },
      status: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        backgroundColor: c.accentSurface,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 12,
      },
      statusText: {
        color: c.text,
        fontSize: 13,
      },
      bio: {
        color: c.text,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 12,
      },
      metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
      },
      metaText: {
        color: c.textMuted,
        fontSize: 13,
      },
    }));

    const platformIcon = useMemo(() => {
      switch (platform) {
        case "pc":
          return <Monitor size={20} color={colors.textMuted} />;
        case "playstation":
          return <PlayStationIcon size={20} fill={colors.textMuted} />;
        case "xbox":
          return <XboxIcon size={20} fill={colors.textMuted} />;
        case "nintendo":
          return <NintendoSwitchIcon size={20} fill={colors.textMuted} />;
        case "android":
          return <AndroidIcon size={20} fill={colors.textMuted} />;
        case "ios":
          return <AppleIcon size={20} fill={colors.textMuted} />;
        default:
          return null;
      }
    }, [platform, colors.textMuted]);

    const countryFlag = flagEmoji(country);
    const avatarSource = photoURL
      ? { uri: photoURL }
      : require("@/assets/default_profile.webp");

    return (
      <View style={styles.headerCard}>
        {bannerURL !== "" ? (
          <Image
            recyclingKey={bannerURL}
            style={styles.banner}
            source={{ uri: bannerURL }}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.bannerFallback} />
        )}

        <View style={styles.body}>
          <View style={styles.identityRow}>
            <Image
              recyclingKey={photoURL}
              style={styles.avatar}
              source={avatarSource}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
              allowDownscaling
            />
            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <CustomText style={[styles.name, { flexShrink: 1 }]} numberOfLines={1}>
                  {displayName}
                </CustomText>
                {onEditProfile && (
                  <TouchableOpacity
                    onPress={onEditProfile}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("settings.profileShowcase.editProfile")}
                  >
                    <Pencil size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {handle !== "" && (
                <CustomText style={styles.handle} numberOfLines={1}>
                  @{handle}
                </CustomText>
              )}
            </View>
          </View>

          {status && (
            <View style={styles.status}>
              {status.emoji !== "" && (
                <CustomText style={styles.statusText}>{status.emoji}</CustomText>
              )}
              <CustomText style={styles.statusText} numberOfLines={2}>
                {status.text}
              </CustomText>
            </View>
          )}

          {bio !== "" && <CustomText style={styles.bio}>{bio}</CustomText>}

          <View style={styles.metaRow}>
            {platformIcon}
            {memberSince && (
              <CustomText style={styles.metaText}>
                {t("settings.profileShowcase.memberSince")} {memberSince}
              </CustomText>
            )}
            {countryFlag !== "" && (
              <CustomText style={styles.metaText}>{countryFlag}</CustomText>
            )}
          </View>
        </View>
      </View>
    );
  },
);

ProfileHeaderCard.displayName = "ProfileHeaderCard";
export default ProfileHeaderCard;
