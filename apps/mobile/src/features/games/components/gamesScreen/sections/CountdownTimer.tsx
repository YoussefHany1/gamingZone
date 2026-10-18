import React from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useCountdown } from "@/src/hooks/useCountdown";

export type CountdownTimerProps = {
  t: (key: string) => string;
  startDate?: string | number;
};

type TimeUnitProps = {
  value: number;
  label: string;
};

/**
 * Digit box inside the countdown overlay. Internal to the free-game card's
 * overlay — not exported (only `CountdownTimer` renders it).
 */
const TimeUnit = React.memo<TimeUnitProps>(({ value, label }) => {
  const styles = useThemeStyles((c) => ({
    timeUnit: {
      alignItems: "center",
    },
    timeValueBox: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 32,
    },
    timeValue: {
      color: c.text,
      fontWeight: "bold",
      textAlign: "center",
    },
    timeLabel: {
      color: c.textMuted,
      fontSize: 8,
      marginTop: 3,
      textAlign: "center",
      textTransform: "uppercase",
    },
  }));

  return (
    <View style={styles.timeUnit}>
      <View style={styles.timeValueBox}>
        <CustomText style={styles.timeValue}>{value}</CustomText>
      </View>
      <CustomText style={styles.timeLabel}>{label}</CustomText>
    </View>
  );
});
TimeUnit.displayName = "TimeUnit";

/**
 * Full-cover countdown overlay for "next" free games. Ported verbatim from
 * the legacy `gamesScreen/FreeGames.tsx` (Phase 3 migration), including the
 * second-precision tick (1000 ms) — an invariant: the seconds must visibly
 * count down. `t` arrives as a prop exactly as the legacy passed it, and
 * the translation keys are the freeGames ones (not the mostAnticipated
 * countdown keys ComingSoon's card reuses).
 *
 * The legacy cast `as CountdownResult | null` is dropped — `useCountdown`
 * already declares exactly that return type.
 */
const CountdownTimer = React.memo<CountdownTimerProps>(({ t, startDate }) => {
  const timeLeft = useCountdown(startDate, 1000);

  const styles = useThemeStyles(() => ({
    countdownOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    },
    countdownGradient: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    countdownTitle: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 12,
      textAlign: "center",
    },
    timerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    separator: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "bold",
      marginHorizontal: 2,
    },
  }));

  if (!timeLeft) return null;

  return (
    <View style={styles.countdownOverlay}>
      <LinearGradient
        colors={["rgba(81, 105, 150, 0.9)", "rgba(12, 26, 51, 0.8)"]}
        style={styles.countdownGradient}
      >
        <CustomText style={styles.countdownTitle}>
          {t("games.list.freeGames.freeOn")}
        </CustomText>
        <View style={styles.timerContainer}>
          <TimeUnit value={timeLeft.days} label={t("games.list.freeGames.days")} />
          <CustomText style={styles.separator}>:</CustomText>
          <TimeUnit value={timeLeft.hours} label={t("games.list.freeGames.hours")} />
          <CustomText style={styles.separator}>:</CustomText>
          <TimeUnit value={timeLeft.minutes} label={t("games.list.freeGames.minutes")} />
          <CustomText style={styles.separator}>:</CustomText>
          <TimeUnit value={timeLeft.seconds} label={t("games.list.freeGames.seconds")} />
        </View>
      </LinearGradient>
    </View>
  );
});
CountdownTimer.displayName = "CountdownTimer";

export default CountdownTimer;
