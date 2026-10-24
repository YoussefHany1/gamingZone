import React from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { PcQuality } from "@gaming-zone/core";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CustomText from "@/src/components/CustomText";

export type PcQualityBadgeProps = {
  quality: PcQuality;
  /** Optional absolute position style (top/right/bottom/left). */
  style?: ViewStyle;
  /** Slightly smaller variant for tight cards. */
  compact?: boolean;
};

// Semantic quality scale — fixed hues (green → purple) that stay readable in
// both schemes. `unsupported` is the exception: it follows the palette's
// danger token so destructive tones track the active theme.
const COLORS: Record<PcQuality, { bg: string; text: string; border: string } | null> = {
  ultra: { bg: "rgba(168, 85, 247, 0.9)", text: "#f3e8ff", border: "rgba(216, 180, 254, 0.9)" },
  high: { bg: "rgba(34, 197, 94, 0.9)", text: "#f0fdf4", border: "rgba(187, 247, 208, 0.9)" },
  medium: { bg: "rgba(234, 179, 8, 0.9)", text: "#fefce8", border: "rgba(254, 240, 138, 0.9)" },
  low: { bg: "rgba(249, 115, 22, 0.9)", text: "#fff7ed", border: "rgba(253, 186, 116, 0.9)" },
  unsupported: null,
};

const PcQualityBadge: React.FC<PcQualityBadgeProps> = ({ quality, style, compact }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    badge: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: compact ? 6 : 8,
      paddingVertical: compact ? 2 : 4,
      borderRadius: 999,
      borderWidth: 1,
      zIndex: 10,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.4,
      shadowRadius: 2,
      elevation: 3,
    },
    text: {
      fontSize: compact ? 9 : 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    label: {
      color: c.textMuted,
      fontSize: 8,
      marginLeft: 3,
      fontWeight: "600",
    },
  }));

  const palette = COLORS[quality];
  const label = t(`pcSpecs.quality.${quality}`);

  const dynamic = palette ?? { bg: colors.danger, text: "#ffffff", border: colors.danger };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: dynamic.bg,
          borderColor: dynamic.border,
        },
        style,
      ]}
    >
      <CustomText style={[styles.text, { color: dynamic.text }]}>{label}</CustomText>
      <CustomText style={styles.label}>{t("pcSpecs.badge.estimate")}</CustomText>
    </View>
  );
};

export default React.memo(PcQualityBadge);
