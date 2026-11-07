import React, { memo } from "react";
import { Linking, Share, ToastAndroid, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Copy, ExternalLink } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import PressScale from "@/src/components/PressScale";
import PlatformGlyph from "./PlatformGlyph";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { BRAND_ACCENTS } from "@/src/constants/brandColors";
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

// Brand identity stays a fixed decorative accent (see `BRAND_ACCENTS`).
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
      glyphWrap: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
      },
      grow: { flex: 1 },
      label: { color: c.textMuted, fontSize: 12 },
      identifier: { color: c.text, fontSize: 15, fontWeight: "600" },
      verified: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
      },
      verifiedText: { color: c.textMuted, fontSize: 10, fontWeight: "700" },
      iconAction: { padding: 6 },
      lastRow: { borderBottomWidth: 0 },
    }));

    if (!privacy.showLinks) return null;

    const visible = PROFILE_LINK_PLATFORMS.map((platform) => links[platform]).filter(
      (link): link is ProfileLink => Boolean(link?.identifier),
    );

    if (visible.length === 0) return null;

    const copyIdentifier = async (name: string, identifier: string): Promise<void> => {
      try {
        await Share.share({ message: `${name}: ${identifier}` });
        if (ToastAndroid)
          ToastAndroid.show(t("social.profile.copied"), ToastAndroid.SHORT);
      } catch {
        // The share sheet was dismissed; nothing to recover.
      }
    };

    return (
      <View style={styles.container}>
        <SectionTitle title={t("social.profile.linksTitle")} />
        <View style={styles.card}>
          {visible.map((link, index) => {
            const url = profileLinkUrl(link);
            const brand =
              BRAND_ACCENTS[link.platform as keyof typeof BRAND_ACCENTS] ?? colors.accent;
            const isLast = index === visible.length - 1;

            return (
              <View key={link.platform} style={[styles.row, isLast && styles.lastRow]}>
                {/* eslint-disable-next-line react-native/no-inline-styles -- brand tint is per-row, cannot live in the shared stylesheet */}
                <View style={[styles.glyphWrap, { backgroundColor: `${brand}22` }]}>
                  <PlatformGlyph
                    platform={link.platform}
                    color={brand}
                    size={22}
                    unknownAsDiscord
                  />
                </View>
                <View style={styles.grow}>
                  <CustomText style={styles.label}>
                    {platformLabel(link.platform)}
                  </CustomText>
                  <CustomText style={styles.identifier} numberOfLines={1}>
                    {link.identifier}
                  </CustomText>
                  <View style={styles.verified}>
                    <BadgeCheck size={12} color={colors.accentText} />
                    <CustomText style={styles.verifiedText}>
                      {t("social.profile.verified")}
                    </CustomText>
                  </View>
                </View>
                <PressScale
                  style={styles.iconAction}
                  onPress={() =>
                    void copyIdentifier(platformLabel(link.platform), link.identifier)
                  }
                >
                  <Copy size={17} color={colors.textMuted} />
                </PressScale>
                {url ? (
                  <PressScale
                    style={styles.iconAction}
                    onPress={() => void Linking.openURL(url)}
                  >
                    <ExternalLink size={17} color={colors.accentText} />
                  </PressScale>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  },
);

PublicLinksCard.displayName = "PublicLinksCard";
export default PublicLinksCard;
