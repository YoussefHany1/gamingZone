import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Monitor } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { ArticlePlatform } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import {
  AndroidIcon,
  AppleIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { NintendoSwitchIcon } from "@/src/components/icons/StoreIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type PlatformBadgesProps = {
  platforms: ArticlePlatform[];
  /** `compact` = icons only (feed cards); `labeled` = icon + name (details). */
  variant?: "compact" | "labeled";
  /** Compact variant only: icons rendered before the `+N` overflow pill. */
  max?: number;
};

/** Card rows stay at four icons; the fifth platform collapses into `+N`. */
const DEFAULT_MAX = 4;

function PlatformIcon({
  platform,
  size,
  tint,
}: {
  platform: ArticlePlatform;
  size: number;
  tint: string;
}): React.ReactElement | null {
  switch (platform) {
    case "pc":
      return <Monitor size={size} color={tint} />;
    case "playstation":
      return <PlayStationIcon size={size} fill={tint} />;
    case "xbox":
      return <XboxIcon size={size} fill={tint} />;
    case "nintendo":
      return <NintendoSwitchIcon size={size} fill={tint} />;
    case "android":
      return <AndroidIcon size={size} fill={tint} />;
    case "ios":
      return <AppleIcon size={size} fill={tint} />;
    default:
      return null;
  }
}

/**
 * Subtle platform row for article cards and the details header. Callers pass
 * `badgePlatformsOf(article)`, so general/all-platform articles render nothing.
 */
const PlatformBadges = memo(function PlatformBadges({
  platforms,
  variant = "compact",
  max = DEFAULT_MAX,
}: PlatformBadgesProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    row: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    compactRow: {
      // gap: 2,
      // marginTop: 6,
    },
    labeledRow: {
      gap: 12,
      // marginTop: 10,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      // backgroundColor: c.surface,
      // borderWidth: StyleSheet.hairlineWidth,
      // borderColor: c.border,
      // paddingHorizontal: 8,
      // paddingVertical: 4,
      // borderRadius: 999,
    },
    chipText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    overflow: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "700",
      // marginLeft: 2,
    },
  }));

  const labels = useMemo(
    () => platforms.map((platform) => t(`news.platforms.${platform}`) || platform),
    [platforms, t],
  );

  if (platforms.length === 0) return null;

  if (variant === "labeled") {
    return (
      <View style={[styles.row, styles.labeledRow]}>
        {platforms.map((platform, index) => (
          <View key={platform} style={styles.chip}>
            <PlatformIcon platform={platform} size={14} tint={colors.textMuted} />
            {/* <CustomText style={styles.chipText}>{labels[index]}</CustomText> */}
          </View>
        ))}
      </View>
    );
  }

  const visible = platforms.slice(0, max);
  const overflow = platforms.length - visible.length;

  return (
    <View style={[styles.row, styles.compactRow]} accessibilityLabel={labels.join(", ")}>
      {visible.map((platform) => (
        <PlatformIcon
          key={platform}
          platform={platform}
          size={13}
          tint={colors.textMuted}
        />
      ))}
      {overflow > 0 && <CustomText style={styles.overflow}>+{overflow}</CustomText>}
    </View>
  );
});

PlatformBadges.displayName = "PlatformBadges";

export default PlatformBadges;
