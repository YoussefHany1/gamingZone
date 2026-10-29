import React, { memo } from "react";
import { Linking, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import {
  DiscordIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { SteamIcon } from "@/src/components/icons/StoreIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import {
  PROFILE_LINK_PLATFORMS,
  profileLinkUrl,
  type ProfileLink,
  type ProfileLinks,
  type ProfileLinkPlatform,
  type ProfilePrivacy,
} from "@gaming-zone/core";

export type PublicLinksCardProps = {
  links: ProfileLinks;
  privacy: ProfilePrivacy;
};

function platformLabel(platform: ProfileLinkPlatform): string {
  switch (platform) {
    case "steam":
      return "Steam";
    case "psn":
      return "PlayStation";
    case "xbox":
      return "Xbox";
    case "discord":
      return "Discord";
    default:
      return platform;
  }
}

function platformIcon(platform: ProfileLinkPlatform, color: string): React.ReactElement {
  switch (platform) {
    case "steam":
      return <SteamIcon size={22} fill={color} />;
    case "psn":
      return <PlayStationIcon size={22} fill={color} />;
    case "xbox":
      return <XboxIcon size={22} fill={color} />;
    case "discord":
    default:
      return <DiscordIcon size={22} fill={color} />;
  }
}

const PublicLinksCard = memo(
  ({ links, privacy }: PublicLinksCardProps): React.ReactElement | null => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      container: { marginBottom: 20 },
      card: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        overflow: "hidden",
      },
      row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
      label: {
        color: c.textMuted,
        fontSize: 12,
      },
      identifier: {
        color: c.text,
        fontSize: 15,
        fontWeight: "600",
      },
      grow: { flex: 1 },
    }));

    if (!privacy.showLinks) return null;

    const visible = PROFILE_LINK_PLATFORMS.map((platform) => links[platform]).filter(
      (link): link is ProfileLink => Boolean(link?.visible),
    );

    if (visible.length === 0) return null;

    return (
      <View style={styles.container}>
        <SectionTitle title={t("social.profile.linksTitle")} />
        <View style={styles.card}>
          {visible.map((link, index) => {
            const url = profileLinkUrl(link);
            const isLast = index === visible.length - 1;

            return (
              <TouchableOpacity
                key={link.platform}
                style={[styles.row, isLast && { borderBottomWidth: 0 }]}
                activeOpacity={url ? 0.6 : 1}
                disabled={!url}
                onPress={url ? () => void Linking.openURL(url) : undefined}
                accessibilityRole={url ? "link" : undefined}
              >
                {platformIcon(link.platform, colors.textMuted)}
                <View style={styles.grow}>
                  <CustomText style={styles.label}>{platformLabel(link.platform)}</CustomText>
                  <CustomText style={styles.identifier} numberOfLines={1}>
                    {link.identifier}
                  </CustomText>
                </View>
                {url && <ExternalLink size={16} color={colors.textMuted} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  },
);

PublicLinksCard.displayName = "PublicLinksCard";
export default PublicLinksCard;
