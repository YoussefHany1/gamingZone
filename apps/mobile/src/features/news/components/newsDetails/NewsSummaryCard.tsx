import React, { memo, useMemo } from "react";
import { View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { NewsSummaryCardProps } from "./types";

/** Highlighted AI summary card, rendered in the summary's own direction. */
const NewsSummaryCard = memo(function NewsSummaryCard({
  summary,
  isRtl,
}: NewsSummaryCardProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    summary: {
      backgroundColor: c.backgroundDeep,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.accentBorder,
      padding: 16,
      marginBottom: 16,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.accentBorder,
    },
    summaryIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    summaryLabel: {
      color: c.accentText,
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    summaryText: {
      fontSize: 15,
      lineHeight: 24,
      color: c.text,
    },
  }));

  const directionStyle = useMemo(
    () => ({ direction: isRtl ? ("rtl" as const) : ("ltr" as const) }),
    [isRtl],
  );

  return (
    <View style={[styles.summary, directionStyle]}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryIconWrap}>
          <Sparkles size={14} color={colors.accentText} />
        </View>
        <CustomText style={styles.summaryLabel}>
          {t("news.details.summaryTitle")}
        </CustomText>
      </View>
      <CustomText style={styles.summaryText}>{summary}</CustomText>
    </View>
  );
});

export default NewsSummaryCard;
