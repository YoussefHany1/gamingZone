import React, { memo, useMemo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import {
  AndroidIcon,
  AppleIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { flagEmoji } from "@/src/lib/flagEmoji";
import type { ProfileHeaderCardProps } from "./types";

/**
 * The profile identity card: avatar, name, and the meta row (preferred
 * platform, join date, country flag). Anything the account has not set is
 * simply left out of the row.
 */
const ProfileHeaderCard = memo(
  ({
    displayName,
    photoURL,
    memberSince,
    platform,
    country,
  }: ProfileHeaderCardProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      headerCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        marginBottom: 24,
      },
      avatar: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: c.skeletonBase,
        borderWidth: 2,
        borderColor: c.textMuted,
      },
      nameBlock: {
        flex: 1,
      },
      name: {
        color: c.text,
        fontSize: 20,
        fontWeight: "700",
      },
      metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 6,
      },
      metaText: {
        color: c.textMuted,
        fontSize: 13,
      },
    }));

    const platformIcon = useMemo(() => {
      switch (platform) {
        case "playstation":
          return <PlayStationIcon size={20} fill={colors.textMuted} />;
        case "xbox":
          return <XboxIcon size={20} fill={colors.textMuted} />;
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
          <CustomText style={styles.name} numberOfLines={1}>
            {displayName}
          </CustomText>
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
