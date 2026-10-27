import React, { memo, useCallback } from "react";
import { Pressable, ScrollView } from "react-native";
import { Monitor } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ARTICLE_PLATFORMS } from "@gaming-zone/core";
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
import type { NewsPlatformFilter } from "../lib/articlePlatforms";

type PlatformFilterChipsProps = {
  value: NewsPlatformFilter;
  onChange: (value: NewsPlatformFilter) => void;
};

function PlatformIcon({
  platform,
  tint,
}: {
  platform: ArticlePlatform;
  tint: string;
}): React.ReactElement | null {
  switch (platform) {
    case "pc":
      return <Monitor size={13} color={tint} />;
    case "playstation":
      return <PlayStationIcon size={13} fill={tint} />;
    case "xbox":
      return <XboxIcon size={13} fill={tint} />;
    case "nintendo":
      return <NintendoSwitchIcon size={13} fill={tint} />;
    case "android":
      return <AndroidIcon size={13} fill={tint} />;
    case "ios":
      return <AppleIcon size={13} fill={tint} />;
    default:
      return null;
  }
}

/**
 * Horizontal platform filter for the News/Reviews tabs. Rendered directly under
 * the source dropdown so the pair reads as "publication → platform".
 */
const PlatformFilterChips = memo(function PlatformFilterChips({
  value,
  onChange,
}: PlatformFilterChipsProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    scroll: {
      flexGrow: 0,
    },
    content: {
      paddingHorizontal: 15,
      paddingTop: 10,
      paddingBottom: 4,
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipSelected: {
      backgroundColor: "transparent",
      borderColor: c.accent,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
    },
    labelSelected: {
      color: c.accentText,
    },
  }));

  const handlePress = useCallback(
    (next: NewsPlatformFilter) => {
      if (next !== value) onChange(next);
    },
    [onChange, value],
  );

  const options: NewsPlatformFilter[] = ["all", ...ARTICLE_PLATFORMS];

  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const selected = option === value;
        const tint = selected ? colors.accentText : colors.textMuted;
        const label =
          option === "all" ? t("news.platforms.all") : t(`news.platforms.${option}`);

        return (
          <Pressable
            key={option}
            onPress={() => handlePress(option)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            hitSlop={4}
          >
            {option !== "all" && <PlatformIcon platform={option} tint={tint} />}
            <CustomText style={[styles.label, selected && styles.labelSelected]}>
              {label}
            </CustomText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

PlatformFilterChips.displayName = "PlatformFilterChips";

export default PlatformFilterChips;
