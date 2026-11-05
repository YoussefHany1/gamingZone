import React from "react";
import { Switch, View } from "react-native";
import { Clock3, Minus, Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import PressScale from "@/src/features/social/components/PressScale";
import {
  useSessionReminderOffset,
  MIN_SESSION_REMINDER_MINUTES,
  MAX_SESSION_REMINDER_MINUTES,
  SESSION_REMINDER_STEP,
} from "../../hooks/useSessionReminderOffset";

/**
 * SessionReminderStepper — the shared control for session reminders:
 * an on/off switch (feature toggle) and the ± lead-time control, where 0
 * means the reminder fires exactly at the session's start time.
 *
 * Appears in BOTH entry points the user can reach it from:
 *   - Notification settings (full card, with description)
 *   - SessionFormSheet (compact row, description omitted)
 * All instances write to the same MMKV/Firestore-backed shared value, so
 * they can never disagree, and the root scheduler re-syncs on any change.
 */
type SessionReminderStepperProps = {
  /** Shows the description line under the title. Default: true. */
  showDescription?: boolean;
};

export default function SessionReminderStepper({
  showDescription = true,
}: SessionReminderStepperProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    remindersEnabled,
    reminderMinutes,
    updateReminderMinutes,
    updateRemindersEnabled,
  } = useSessionReminderOffset();

  const styles = useThemeStyles((c) => ({
    card: {
      marginBottom: 20,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    row: {
      padding: 16,
      gap: 12,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    textBlock: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
    },
    description: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 3,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 14,
      gap: 12,
    },
    stepperLabel: {
      fontSize: 13,
      color: c.textMuted,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    stepperButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    stepperButtonDisabled: {
      opacity: 0.35,
    },
    valueText: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
    },
    stepperDisabled: {
      opacity: 0.35,
    },
    switch: {
      transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
    },
  }));

  const atMin = reminderMinutes <= MIN_SESSION_REMINDER_MINUTES;
  const atMax = reminderMinutes >= MAX_SESSION_REMINDER_MINUTES;

  const press = (delta: number) => () => {
    updateReminderMinutes(reminderMinutes + delta);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          <Clock3 size={24} color={colors.accentText} />
          <View style={styles.textBlock}>
            <CustomText style={styles.title}>{t("social.sessions.reminder.title")}</CustomText>
            {showDescription && (
              <CustomText style={styles.description} numberOfLines={2}>
                {t("social.sessions.reminder.description")}
              </CustomText>
            )}
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={updateRemindersEnabled}
            accessibilityLabel={t("social.sessions.reminder.title")}
            trackColor={{ false: colors.backgroundDeep, true: colors.accent }}
            thumbColor={remindersEnabled ? colors.onAccent : colors.textMuted}
            style={styles.switch}
          />
        </View>
        <View
          style={[styles.stepperRow, !remindersEnabled && styles.stepperDisabled]}
          pointerEvents={remindersEnabled ? "auto" : "none"}
        >
          <CustomText style={styles.stepperLabel}>
            {t("social.sessions.reminder.leadTime")}
          </CustomText>
          <View style={styles.stepper}>
            <PressScale
              style={[styles.stepperButton, (atMin || !remindersEnabled) && styles.stepperButtonDisabled]}
              onPress={press(-SESSION_REMINDER_STEP)}
              disabled={atMin || !remindersEnabled}
            >
              <Minus size={16} color={colors.accentText} />
            </PressScale>
            <CustomText
              style={styles.valueText}
              accessibilityLabel={t("social.sessions.reminder.title")}
            >
              {reminderMinutes === 0
                ? t("social.sessions.reminder.atStart")
                : t("social.sessions.reminder.minutes", { minutes: reminderMinutes })}
            </CustomText>
            <PressScale
              style={[styles.stepperButton, (atMax || !remindersEnabled) && styles.stepperButtonDisabled]}
              onPress={press(SESSION_REMINDER_STEP)}
              disabled={atMax || !remindersEnabled}
            >
              <Plus size={16} color={colors.accentText} />
            </PressScale>
          </View>
        </View>
      </View>
    </View>
  );
}
