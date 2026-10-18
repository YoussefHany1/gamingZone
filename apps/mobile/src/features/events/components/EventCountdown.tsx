import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CountdownBox from "./CountdownBox";
import type { EventCountdownProps } from "../types";

/** "Starts In" section: days : hours : min : sec boxes. */
const EventCountdown: React.FC<EventCountdownProps> = ({ timeUntil }) => {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    section: { marginTop: 24 },
    countdownRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: 6,
    },
    countdownSep: {
      color: c.textMuted,
      fontSize: 26,
      fontWeight: "bold",
      marginTop: 14,
    },
  }));

  return (
    <View style={styles.section}>
      <SectionTitle title={t("events.startsIn") || "Starts In"} />
      <View style={styles.countdownRow}>
        <CountdownBox value={timeUntil.days} label="Days" />
        <CustomText style={styles.countdownSep}>:</CustomText>
        <CountdownBox value={timeUntil.hours} label="Hours" />
        <CustomText style={styles.countdownSep}>:</CustomText>
        <CountdownBox value={timeUntil.minutes} label="Min" />
        <CustomText style={styles.countdownSep}>:</CustomText>
        <CountdownBox value={timeUntil.seconds} label="Sec" />
      </View>
    </View>
  );
};

export default memo(EventCountdown);
