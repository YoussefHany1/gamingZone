import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EventStatusBadgeProps } from "../types";

/** Live / Upcoming / Ended pill rendered over the hero art. */
const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({ status }) => {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 10,
      gap: 5,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.text,
    },
    liveText: {
      color: c.text,
      fontSize: 11,
      fontWeight: "bold",
      textTransform: "uppercase",
    },
    upcomingBadge: {
      backgroundColor: c.accentSurface,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.textMuted,
    },
    upcomingText: { color: c.text, fontSize: 11, fontWeight: "bold" },
    endedBadge: {
      backgroundColor: "#44444480",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.textSubtle,
    },
    endedText: { color: c.textSubtle, fontSize: 11, fontWeight: "bold" },
  }));

  if (status === "live") {
    return (
      <LinearGradient colors={[colors.danger, colors.danger]} style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <CustomText style={styles.liveText}>{t("home.gamingEvents.live")}</CustomText>
      </LinearGradient>
    );
  }

  if (status === "upcoming") {
    return (
      <View style={styles.upcomingBadge}>
        <CustomText style={styles.upcomingText}>
          {t("home.gamingEvents.upcoming")}
        </CustomText>
      </View>
    );
  }

  return (
    <View style={styles.endedBadge}>
      <CustomText style={styles.endedText}>Ended</CustomText>
    </View>
  );
};

export default memo(EventStatusBadge);
