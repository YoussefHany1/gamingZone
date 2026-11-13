import React, { memo, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import AppImage from "@/src/components/AppImage";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import useCachedData from "@/src/hooks/useCachedData";
import { useAuthStore } from "@/src/store/useAuthStore";
import { flagEmoji } from "@/src/lib/flagEmoji";
import type { ProfileStatus, PublicProfile } from "@gaming-zone/core";
import { getMutualFriendCount } from "../lib/friendService";
import PlatformGlyph from "./PlatformGlyph";

export type PublicProfileHeaderProps = {
  /** Public profile projection; when present its fields are authoritative. */
  profile?: PublicProfile;
  /** Flat display fields — used by owner contexts (Settings) that lack a projection. */
  displayName?: string;
  photoURL?: string | null;
  memberSince?: string | null;
  platform?: string;
  country?: string;
  handle?: string | null;
  bannerURL?: string | null;
  bio?: string;
  status?: ProfileStatus | null;
  /** Only the owner gets the pencil. */
  onEdit?: () => void;
  /** Owner uid — mutual friends are only fetched for other viewers. */
  profileUid?: string;
  /** Viewer uid from the auth store; disables the mutuals fetch for the owner. */
  viewerUid?: string | null;
};

/**
 * The profile identity card: banner, avatar, display name, @handle, status,
 * bio and the meta row (platform, member since, country flag). Anything optional
 * is simply omitted, so a profile that has only claimed a handle still renders
 * as a clean card.
 *
 * One component serves both the public user profile screen and the owner's own
 * profile screen: pass a full `profile` projection, or flat fields (owner
 * context). Mutual friends are only fetched when another member's profile is
 * being viewed.
 */
const PublicProfileHeader = memo(
  ({
    profile,
    displayName,
    photoURL,
    memberSince,
    platform,
    country,
    handle,
    bannerURL,
    bio,
    status,
    onEdit,
    profileUid,
    viewerUid,
  }: PublicProfileHeaderProps): React.ReactElement => {
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
        flexShrink: 1,
      },
      handle: {
        color: c.textMuted,
        fontSize: 14,
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
      mutuals: {
        color: c.textMuted,
        fontSize: 12,
        marginTop: 4,
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

    const resolvedDisplayName = displayName ?? profile?.displayName ?? "";
    const resolvedPhotoURL = photoURL ?? profile?.photoURL ?? null;
    const resolvedHandle = handle ?? profile?.handle ?? null;
    const resolvedBannerURL = bannerURL ?? profile?.bannerURL ?? null;
    const resolvedBio = bio ?? profile?.bio ?? "";
    const resolvedStatus = status ?? profile?.status ?? null;
    const resolvedPlatform = platform ?? profile?.platform;
    const resolvedCountry = country ?? profile?.country;
    const resolvedUid = profile?.uid ?? profileUid ?? "";
    const createdAt = profile?.createdAt ?? null;

    const avatarSource = resolvedPhotoURL
      ? { uri: resolvedPhotoURL }
      : require("@/assets/default_profile.webp");

    const countryFlag = flagEmoji(resolvedCountry ?? "");
    const platformIcon = <PlatformGlyph platform={resolvedPlatform} color={colors.textMuted} size={16} />;

    const memberSinceLabel = useMemo(() => {
      if (memberSince) return memberSince;
      if (!createdAt) return null;
      try {
        return new Date(createdAt).toLocaleDateString(i18n.language, {
          month: "long",
          year: "numeric",
        });
      } catch {
        return null;
      }
    }, [memberSince, createdAt, i18n.language]);

    // Mutual friends: only fetched when viewing someone else's profile. The
    // count is cached per (viewer, profile) pair in MMKV with a short TTL so
    // tab switches and list scrolls never re-request the backend.
    const viewerUidFromStore = useAuthStore((state) => state.user?.uid ?? null);
    const resolvedViewerUid = viewerUid ?? viewerUidFromStore;
    const isOwnProfile = !resolvedUid || !resolvedViewerUid || resolvedViewerUid === resolvedUid;
    const { data: mutualCount } = useCachedData<number>(
      resolvedUid
        ? `social/mutuals/${resolvedViewerUid ?? "anon"}_${resolvedUid}`
        : "social/mutuals/disabled",
      () => getMutualFriendCount(resolvedUid),
      [resolvedUid, resolvedViewerUid],
      300_000,
      !isOwnProfile,
    );

    return (
      <View style={styles.card}>
        {resolvedBannerURL ? (
          <AppImage
            style={styles.banner}
            source={{ uri: resolvedBannerURL }}
            contentFit="cover"
            transition={250}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.bannerFallback} />
        )}

        <View style={styles.body}>
          <View style={styles.avatarRow}>
            <AppImage
              recyclingKey={resolvedPhotoURL ?? null}
              style={styles.avatar}
              source={avatarSource}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              allowDownscaling
            />
            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <CustomText style={[styles.name]} numberOfLines={1}>
                  {resolvedDisplayName}
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
              {resolvedHandle ? (
                <CustomText style={styles.handle} numberOfLines={1}>
                  @{resolvedHandle}
                </CustomText>
              ) : null}
              {typeof mutualCount === "number" && mutualCount > 0 && (
                <CustomText style={styles.mutuals}>
                  {t("social.profile.mutualFriends", { count: mutualCount })}
                </CustomText>
              )}
            </View>
          </View>

          {resolvedStatus && (
            <View style={styles.status}>
              {resolvedStatus.emoji !== "" && (
                <CustomText style={styles.statusText}>{resolvedStatus.emoji}</CustomText>
              )}
              <CustomText style={styles.statusText} numberOfLines={2}>
                {resolvedStatus.text}
              </CustomText>
            </View>
          )}

          {resolvedBio ? <CustomText style={styles.bio}>{resolvedBio}</CustomText> : null}

          <View style={styles.metaRow}>
            {platformIcon}
            {memberSinceLabel && (
              <CustomText style={styles.metaText}>
                {t("settings.profileShowcase.memberSince")} {memberSinceLabel}
              </CustomText>
            )}
            {countryFlag !== "" && <CustomText style={styles.metaText}>{countryFlag}</CustomText>}
          </View>
        </View>
      </View>
    );
  },
);

PublicProfileHeader.displayName = "PublicProfileHeader";
export default PublicProfileHeader;
