import React, { memo, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import {
  DiscordIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { SteamIcon } from "@/src/components/icons/StoreIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { flagEmoji } from "@/src/lib/flagEmoji";
import type { PublicProfile } from "@gaming-zone/core";

export type PublicProfileHeaderProps = {
  profile: PublicProfile;
  /** Only the owner gets the pencil. */
  onEdit?: () => void;
};

/**
 * The public identity card: banner, avatar, display name, @handle, status and
 * bio. Everything optional is simply omitted, so a profile that has only
 * claimed a handle still renders as a clean card.
 */
const PublicProfileHeader = memo(
  ({ profile, onEdit }: PublicProfileHeaderProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t, i18n } = useTranslation();

    const styles = useThemeStyles((c) => ({
      card: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        overflow: "hidden",
        marginBottom: 20,
      },
      banner: {
        width: "100%",
        height: 120,
        backgroundColor: c.accentSurface,
      },
      bannerFallback: {
        width: "100%",
        height: 72,
        backgroundColor: c.accentSurface,
      },
      body: {
        paddingHorizontal: 16,
        paddingBottom: 16,
      },
      avatarRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginTop: -32,
        gap: 12,
      },
      avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: c.surface,
        backgroundColor: c.skeletonBase,
      },
      nameBlock: {
        flex: 1,
        paddingBottom: 4,
      },
      nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      },
      name: {
        color: c.text,
        fontSize: 20,
        fontWeight: "700",
      },
      handle: {
        color: c.textMuted,
        fontSize: 14,
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
        fontSize: 12,
      },
    }));

    const avatarSource = profile.photoURL
      ? { uri: profile.photoURL }
      : require("@/assets/default_profile.webp");

    const countryFlag = flagEmoji(profile.country);

    const platformIcon = useMemo(() => {
      switch (profile.platform) {
        case "playstation":
          return <PlayStationIcon size={16} fill={colors.textMuted} />;
        case "xbox":
          return <XboxIcon size={16} fill={colors.textMuted} />;
        case "discord":
          return <DiscordIcon size={16} fill={colors.textMuted} />;
        case "steam":
          return <SteamIcon size={16} fill={colors.textMuted} />;
        default:
          return null;
      }
    }, [profile.platform, colors.textMuted]);

    const memberSince = useMemo(() => {
      if (!profile.createdAt) return null;
      try {
        return new Date(profile.createdAt).toLocaleDateString(i18n.language, {
          month: "long",
          year: "numeric",
        });
      } catch {
        return null;
      }
    }, [profile.createdAt, i18n.language]);

    return (
      <View style={styles.card}>
        {profile.bannerURL ? (
          <Image
            style={styles.banner}
            source={{ uri: profile.bannerURL }}
            contentFit="cover"
            transition={250}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.bannerFallback} />
        )}

        <View style={styles.body}>
          <View style={styles.avatarRow}>
            <Image
              recyclingKey={profile.photoURL ?? null}
              style={styles.avatar}
              source={avatarSource}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
            />
            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <CustomText style={[styles.name, { flexShrink: 1 }]} numberOfLines={1}>
                  {profile.displayName}
                </CustomText>
                {onEdit && (
                  <TouchableOpacity
                    onPress={onEdit}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("settings.profileShowcase.editProfile")}
                  >
                    <Pencil size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <CustomText style={styles.handle} numberOfLines={1}>
                @{profile.handle}
              </CustomText>
            </View>
          </View>

          {profile.status && (
            <View style={styles.status}>
              {profile.status.emoji !== "" && (
                <CustomText style={styles.statusText}>{profile.status.emoji}</CustomText>
              )}
              <CustomText style={styles.statusText} numberOfLines={2}>
                {profile.status.text}
              </CustomText>
            </View>
          )}

          {profile.bio !== "" && <CustomText style={styles.bio}>{profile.bio}</CustomText>}

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

PublicProfileHeader.displayName = "PublicProfileHeader";
export default PublicProfileHeader;
