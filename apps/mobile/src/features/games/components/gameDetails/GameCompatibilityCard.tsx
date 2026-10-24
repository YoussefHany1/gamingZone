import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { PcCompatibility } from "@gaming-zone/core";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useSharedStyles } from "./shared";
import CustomText from "@/src/components/CustomText";
import PcQualityBadge from "@/src/features/pcSpecs/components/PcQualityBadge";

export type GameCompatibilityCardProps = {
  compatibility: PcCompatibility | null;
  hasSpecs: boolean;
};

const GameCompatibilityCard: React.FC<GameCompatibilityCardProps> = ({
  compatibility,
  hasSpecs,
}) => {
  const { t } = useTranslation();
  const sharedStyles = useSharedStyles();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    card: {
      marginTop: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      color: c.text,
      fontSize: 16,
      fontWeight: "700",
    },
    subtitle: {
      color: c.textMuted,
      fontSize: 12,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    partName: {
      color: c.textMuted,
      fontSize: 13,
      textTransform: "capitalize",
    },
    partValue: {
      color: c.text,
      fontSize: 13,
      textAlign: "right",
      flex: 1,
      marginLeft: 12,
    },
    status: {
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 8,
    },
    footer: {
      color: c.textMuted,
      fontSize: 11,
    },
  }));

  if (!hasSpecs) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <CustomText style={styles.title}>{t("games.details.compatibility.title")}</CustomText>
        </View>
        <CustomText style={styles.subtitle}>
          {t("games.details.compatibility.noSpecs")}
        </CustomText>
      </View>
    );
  }

  if (!compatibility) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <CustomText style={styles.title}>{t("games.details.compatibility.title")}</CustomText>
        </View>
        <CustomText style={styles.subtitle}>
          {t("games.details.compatibility.noData")}
        </CustomText>
      </View>
    );
  }

  const statusColor = (status: "meets" | "below" | "unknown") => {
    if (status === "meets") return colors.accentText;
    if (status === "below") return colors.danger;
    return colors.textMuted;
  };

  const parts = (["cpu", "gpu", "ram", "storage"] as const).map((key) => ({
    key,
    ...compatibility.parts[key],
  }));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CustomText style={styles.title}>{t("games.details.compatibility.title")}</CustomText>
        <PcQualityBadge quality={compatibility.quality} compact />
      </View>
      <CustomText style={styles.subtitle}>
        {t("games.details.compatibility.estimate", {
          resolution: t(`pcSpecs.resolution.r${compatibility.resolution}`),
        })}
      </CustomText>
      {parts.map((part) => (
        <View key={part.key} style={styles.row}>
          <CustomText style={styles.partName}>
            {t(`games.details.compatibility.parts.${part.key}`)}
          </CustomText>
          <CustomText style={styles.partValue} numberOfLines={2}>
            {part.actual}
          </CustomText>
          <CustomText style={[styles.status, { color: statusColor(part.status) }]}>
            {t(`games.details.compatibility.status.${part.status}`)}
          </CustomText>
        </View>
      ))}
      {compatibility.bottleneck && (
        <CustomText style={styles.subtitle}>
          {t("games.details.compatibility.bottleneck", {
            part: t(`games.details.compatibility.parts.${compatibility.bottleneck}`),
          })}
        </CustomText>
      )}
      {compatibility.approximate && (
        <CustomText style={styles.footer}>{t("games.details.compatibility.approximate")}</CustomText>
      )}
    </View>
  );
};

export default React.memo(GameCompatibilityCard);
