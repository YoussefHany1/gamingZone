import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Monitor } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import {
  AndroidIcon,
  AppleIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ProfilePlatformSelectorProps } from "./types";

/**
 * Single-select preferred platform.
 *
 * The brand marks are solid glyphs, so they are tinted through `fill`; the
 * generic monitor icon is stroked and takes `color` instead.
 */
const ProfilePlatformSelector = memo(
  ({ value, onChange }: ProfilePlatformSelectorProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      container: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        marginBottom: 20,
        gap: 10,
      },
      button: {
        width: "30%",
        backgroundColor: c.surface,
        borderRadius: 12,
        padding: 15,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "transparent",
      },
      buttonSelected: {
        backgroundColor: c.accentSurface,
        borderColor: c.accent,
      },
      buttonText: {
        color: c.textMuted,
        marginTop: 8,
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
      },
      buttonTextSelected: {
        color: c.accentText,
      },
    }));

    const options = [
      { id: "pc", icon: Monitor, label: t("settings.profile.platforms.pc") || "PC" },
      {
        id: "playstation",
        icon: PlayStationIcon,
        label: t("settings.profile.platforms.playstation") || "PlayStation",
      },
      {
        id: "xbox",
        icon: XboxIcon,
        label: t("settings.profile.platforms.xbox") || "Xbox",
      },
      {
        id: "android",
        icon: AndroidIcon,
        label: t("settings.profile.platforms.android") || "Android",
      },
      {
        id: "ios",
        icon: AppleIcon,
        label: t("settings.profile.platforms.ios") || "iOS",
      },
    ];

    return (
      <>
        <SectionTitle title={t("settings.profile.platformLabel")} />
        <View style={styles.container}>
          {options.map((option) => {
            const isSelected = value === option.id;
            const Icon = option.icon;
            const tint = isSelected ? colors.text : colors.textMuted;

            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.button, isSelected && styles.buttonSelected]}
                onPress={() => onChange(option.id)}
                activeOpacity={0.7}
              >
                {Icon === Monitor ? (
                  <Icon size={32} color={tint} />
                ) : (
                  <Icon size={32} fill={tint} />
                )}
                <CustomText
                  style={[styles.buttonText, isSelected && styles.buttonTextSelected]}
                >
                  {option.label}
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  },
);

ProfilePlatformSelector.displayName = "ProfilePlatformSelector";
export default ProfilePlatformSelector;
