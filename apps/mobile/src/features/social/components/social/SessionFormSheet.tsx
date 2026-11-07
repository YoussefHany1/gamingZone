import React, { useMemo } from "react";
import { Platform, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import {
  Calendar,
  Clock,
  Gamepad2,
  Link as LinkIcon,
  MessageSquare,
  Users,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Conversation } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import IconButton from "@/src/components/IconButton";
import GameSearchField from "@/src/features/social/components/social/GameSearchField";
import SessionReminderStepper from "@/src/features/social/components/social/SessionReminderStepper";
import ToggleChipRow from "@/src/features/social/components/common/ToggleChipRow";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { validateSessionUrl } from "../../lib/sessionLink";
import GameBottomSheet from "../GameBottomSheet";
import PressScale from "@/src/components/PressScale";
import type { SessionFormState } from "../../hooks/useSocialScreen";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** The shared section row: icon + label + required/optional markers. */
function SectionHeader({
  icon: Icon,
  label,
  required = false,
  optionalBadge,
}: {
  icon: LucideIcon;
  /** Already-translated label. */
  label: string;
  required?: boolean;
  /** Already-translated badge rendered at the end (e.g. "Optional"). */
  optionalBadge?: string;
}): React.ReactElement {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    sectionLabel: {
      color: c.text,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    sectionRequired: { color: c.accent, fontSize: 13, fontWeight: "800" },
    optionalBadge: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "600",
      marginLeft: "auto",
    },
  }));

  return (
    <View style={styles.sectionHeader}>
      <Icon size={14} color={colors.accent} />
      <CustomText style={styles.sectionLabel}>{label}</CustomText>
      {required ? (
        <CustomText style={styles.sectionRequired}>*</CustomText>
      ) : null}
      {optionalBadge ? (
        <CustomText style={styles.optionalBadge}>{optionalBadge}</CustomText>
      ) : null}
    </View>
  );
}

export type SessionFormSheetProps = {
  sessionForm: SessionFormState | null;
  conversations: Conversation[];
  friendProfiles: Record<string, { displayName?: string } | undefined>;
  uid: string;
  sessionBusy: boolean;
  onChange: (
    updater: (previous: SessionFormState | null) => SessionFormState | null,
  ) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export default function SessionFormSheet({
  sessionForm,
  conversations,
  friendProfiles,
  uid,
  sessionBusy,
  onChange,
  onSubmit,
  onClose,
}: SessionFormSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.accentSurface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.accentBorder ?? c.border,
    },
    sheetTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "900",
    },
    sheetSubtitle: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    section: {
      marginBottom: 16,
    },
    emptyChatsBox: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyChatsText: {
      color: c.textMuted,
      fontSize: 12,
    },
    dateTimeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    dateTimeIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.accentSurface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.accentBorder ?? c.border,
    },
    dateTimeContent: {
      flex: 1,
    },
    dateTimeLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    dateTimeValue: {
      color: c.text,
      fontSize: 14,
      fontWeight: "800",
    },
    dateTimeButton: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    dateTimeButtonText: {
      color: c.accent,
      fontSize: 12,
      fontWeight: "800",
    },
    iosPickerContainer: {
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      padding: 8,
      overflow: "hidden",
    },
    linkFieldsCard: {
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    input: {
      color: c.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.backgroundDeep,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 13,
    },
    inputError: {
      borderColor: c.danger,
    },
    linkErrorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: -4,
    },
    linkError: {
      color: c.danger,
      fontSize: 11,
      fontWeight: "600",
    },
    sheetActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    actionGrow: {
      flex: 1.5,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.accent,
      flexDirection: "row",
      gap: 6,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    actionDisabled: {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    },
    secondaryGrow: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    actionText: {
      color: c.onAccent,
      fontSize: 13,
      fontWeight: "800",
    },
    secondaryButtonText: {
      color: c.text,
      fontSize: 13,
      fontWeight: "700",
    },
  }));

  const openAndroidTimePicker = (date: Date) => {
    DateTimePickerAndroid.open({
      mode: "time",
      value: date,
      onValueChange: (_event, time) => {
        if (!time) return;
        onChange((previous) => (previous ? { ...previous, startsAt: time } : previous));
      },
    });
  };

  const openAndroidDatePicker = () => {
    if (!sessionForm) return;
    DateTimePickerAndroid.open({
      mode: "date",
      value: sessionForm.startsAt,
      minimumDate: new Date(Date.now() + FIVE_MINUTES_MS),
      onValueChange: (_event, date) => {
        if (!date) return;
        onChange((previous) => (previous ? { ...previous, startsAt: date } : previous));
        openAndroidTimePicker(date);
      },
    });
  };

  const canSubmit =
    sessionForm !== null &&
    sessionForm.conversationId.length > 0 &&
    sessionForm.gameName.trim().length > 0;

  // Link fields are creation-time only; an existing session is edited via
  // proposals, where links would silently be ignored.
  const showLinkFields = sessionForm !== null && !sessionForm.sessionId;
  const linkUrl = sessionForm?.linkUrl ?? "";
  const linkLabel = sessionForm?.linkLabel ?? "";
  const linkTypeError = linkUrl.trim().length > 0 && validateSessionUrl(linkUrl) === null;

  const formattedDate = useMemo(() => {
    if (!sessionForm?.startsAt) return "";
    try {
      return sessionForm.startsAt.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return sessionForm.startsAt.toDateString();
    }
  }, [sessionForm?.startsAt]);

  const formattedTime = useMemo(() => {
    if (!sessionForm?.startsAt) return "";
    try {
      return sessionForm.startsAt.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return sessionForm.startsAt.toTimeString().slice(0, 5);
    }
  }, [sessionForm?.startsAt]);

  const conversationChips = useMemo(() => {
    if (!sessionForm) return [];
    return conversations.map((conversation) => {
      const isDm = conversation.type === "dm";
      const label = isDm
        ? (friendProfiles[
            conversation.members.find((member) => member !== uid) ?? ""
          ]?.displayName ?? t("social.chats.directMessage"))
        : (conversation.title ?? t("social.groups.fallback"));
      return { key: conversation.id, label, icon: isDm ? MessageSquare : Users };
    });
  }, [conversations, friendProfiles, sessionForm, uid, t]);

  return (
    <GameBottomSheet
      visible={sessionForm !== null}
      onClose={onClose}
      name="SessionFormSheet"
      file={SHEET_FILE}
    >
      {/* Sheet Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBadge}>
            <Gamepad2 size={20} color={colors.accent} />
          </View>
          <View>
            <CustomText style={styles.sheetTitle}>
              {sessionForm?.sessionId
                ? t("social.sessions.changeGame", { defaultValue: "Edit Session" })
                : t("social.sessions.schedule")}
            </CustomText>
            <CustomText style={styles.sheetSubtitle}>
              {t("social.sessions.reminder.notificationBody", {
                time: formattedTime || "--:--",
                gameName: sessionForm?.gameName || "...",
                defaultValue: "Organize play session with team",
              })}
            </CustomText>
          </View>
        </View>
        <IconButton onPress={onClose} size={32} variant="surface" bordered>
          <X size={16} color={colors.textMuted} />
        </IconButton>
      </View>

      {sessionForm && (
        <>
          {/* Section 1: Conversation Picker */}
          <View style={styles.section}>
            <SectionHeader icon={Users} label={t("social.chats.conversation")} required />

            {conversations.length === 0 ? (
              <View style={styles.emptyChatsBox}>
                <CustomText style={styles.emptyChatsText}>
                  {t("social.sessions.noChatsYet")}
                </CustomText>
              </View>
            ) : (
              <ToggleChipRow
                variant="compact"
                options={conversationChips}
                value={sessionForm.conversationId}
                onChipPress={(key) =>
                  onChange((previous) =>
                    previous ? { ...previous, conversationId: key } : previous,
                  )
                }
              />
            )}
          </View>

          {/* Section 2: Game Picker */}
          <View style={styles.section}>
            <SectionHeader icon={Gamepad2} label={t("social.sessions.gameName")} required />
            <GameSearchField
              selected={sessionForm.gameName ? { name: sessionForm.gameName } : null}
              locked={Boolean(sessionForm.sessionId)}
              onSelect={(game) =>
                onChange((previous) =>
                  previous
                    ? { ...previous, gameName: game.name, gameId: game.id }
                    : previous,
                )
              }
              onClear={() =>
                onChange((previous) =>
                  previous ? { ...previous, gameName: "", gameId: "" } : previous,
                )
              }
            />
          </View>

          {/* Section 3: Date & Time */}
          <View style={styles.section}>
            <SectionHeader icon={Calendar} label={t("social.sessions.schedule")} required />

            {Platform.OS === "android" ? (
              <PressScale
                style={styles.dateTimeCard}
                onPress={openAndroidDatePicker}
              >
                <View style={styles.dateTimeIconWrap}>
                  <Clock size={18} color={colors.accent} />
                </View>
                <View style={styles.dateTimeContent}>
                  <CustomText style={styles.dateTimeLabel}>
                    {formattedDate}
                  </CustomText>
                  <CustomText style={styles.dateTimeValue}>
                    {formattedTime}
                  </CustomText>
                </View>
                <View style={styles.dateTimeButton}>
                  <CustomText style={styles.dateTimeButtonText}>
                    {t("social.groups.select", { defaultValue: "Edit" })}
                  </CustomText>
                </View>
              </PressScale>
            ) : (
              <View style={styles.iosPickerContainer}>
                <DateTimePicker
                  value={sessionForm.startsAt}
                  mode="datetime"
                  minimumDate={new Date(Date.now() + FIVE_MINUTES_MS)}
                  display="spinner"
                  onChange={(event, date) => {
                    if (event.type === "set" && date)
                      onChange((previous) =>
                        previous ? { ...previous, startsAt: date } : previous,
                      );
                  }}
                />
              </View>
            )}
          </View>

          {/* Section 4: External Party / Voice Link (Optional) */}
          {showLinkFields && (
            <View style={styles.section}>
              <SectionHeader
                icon={LinkIcon}
                label={t("social.sessions.links.add")}
                optionalBadge={
                  t("social.sessions.links.labelPlaceholder", {
                    defaultValue: "Optional",
                  }).match(/\((.*?)\)/)?.[1] || "Optional"
                }
              />

              <View style={styles.linkFieldsCard}>
                <CustomTextInput
                  value={linkUrl}
                  onChangeText={(value) =>
                    onChange((previous) =>
                      previous ? { ...previous, linkUrl: value } : previous,
                    )
                  }
                  placeholder={t("social.sessions.links.urlPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, linkTypeError && styles.inputError]}
                />
                {linkTypeError && (
                  <View style={styles.linkErrorRow}>
                    <AlertCircle size={12} color={colors.danger} />
                    <CustomText style={styles.linkError}>
                      {t("social.sessions.links.invalidUrl")}
                    </CustomText>
                  </View>
                )}
                <CustomTextInput
                  value={linkLabel}
                  onChangeText={(value) =>
                    onChange((previous) =>
                      previous ? { ...previous, linkLabel: value } : previous,
                    )
                  }
                  placeholder={t("social.sessions.links.labelPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  maxLength={40}
                  style={styles.input}
                />
              </View>
            </View>
          )}

          {/* Section 5: Reminder Settings */}
          <View style={styles.section}>
            <SessionReminderStepper showDescription={false} />
          </View>
        </>
      )}

      {/* Footer Actions */}
      <View style={styles.sheetActions}>
        <PressScale
          style={[
            styles.actionGrow,
            (sessionBusy || !canSubmit) && styles.actionDisabled,
          ]}
          onPress={onSubmit}
          disabled={sessionBusy || !canSubmit}
        >
          <Sparkles size={16} color={colors.onAccent} />
          <CustomText style={styles.actionText}>
            {sessionBusy
              ? t("social.sessions.saving")
              : canSubmit
                ? t("social.sessions.schedule")
                : t("social.sessions.selectGameFirst")}
          </CustomText>
        </PressScale>
        <PressScale style={styles.secondaryGrow} onPress={onClose}>
          <CustomText style={styles.secondaryButtonText}>
            {t("social.sessions.cancel")}
          </CustomText>
        </PressScale>
      </View>
    </GameBottomSheet>
  );
}
