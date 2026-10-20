import React, { memo } from "react";
import { View } from "react-native";
import { Calendar, Flag } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EventDatesProps } from "../types";

/** Start / End date blocks. */
const EventDates: React.FC<EventDatesProps> = ({ startDateStr, endDateStr }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    datesRow: {
      gap: 10,
      marginBottom: 8,
    },
    dateBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.accentSurface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    dateBlockLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    dateBlockValue: {
      color: c.text,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 2,
    },
  }));

  return (
    <View style={styles.datesRow}>
      <View style={styles.dateBlock}>
        <View collapsable={false}>
          <Calendar size={18} color={colors.accentText} />
        </View>
        <View>
          <CustomText style={styles.dateBlockLabel}>{t("events.starts")}</CustomText>
          <CustomText style={styles.dateBlockValue}>{startDateStr}</CustomText>
        </View>
      </View>
      <View style={styles.dateBlock}>
        <View collapsable={false}>
          <Flag size={18} color={colors.accentText} />
        </View>
        <View>
          <CustomText style={styles.dateBlockLabel}>{t("events.ends")}</CustomText>
          <CustomText style={styles.dateBlockValue}>{endDateStr}</CustomText>
        </View>
      </View>
    </View>
  );
};

export default memo(EventDates);
