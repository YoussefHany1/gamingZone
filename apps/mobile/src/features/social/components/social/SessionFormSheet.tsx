import React from "react";
import { Platform, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import type { Conversation } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import GameSearchField from "@/src/features/social/components/social/GameSearchField";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { validateSessionUrl } from "../../lib/sessionLink";
import GameBottomSheet from "../GameBottomSheet";
import PressScale from "../PressScale";
import type { SessionFormState } from "../../hooks/useSocialScreen";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";
const FIVE_MINUTES_MS = 5 * 60 * 1000;

type SessionFormSheetProps = {
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
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: "900", marginBottom: 14 },
    muted: { color: c.textMuted, fontSize: 12, marginTop: 3 },
    subTabs: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    subTab: {
      flex: 1,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    subTabActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    subTabText: { color: c.text, fontSize: 12, fontWeight: "700" },
    subTabTextActive: { color: c.onAccent },
    secondaryButton: {
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 11,
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryButtonText: { color: c.text, fontSize: 12, fontWeight: "700" },
    sheetActions: { flexDirection: "row", gap: 10, marginTop: 6 },
    actionGrow: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: c.accent,
    },
    secondaryGrow: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    actionText: { color: c.onAccent, fontSize: 12, fontWeight: "800" },
    input: {
      color: c.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
      borderRadius: 13,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    linkError: { color: c.danger, fontSize: 12, marginBottom: 10 },
  }));

  const openAndroidTimePicker = (date: Date) => {
    DateTimePickerAndroid.open({
      mode: "time",
      value: date,
      onValueChange: (_event, time) => {
        if (!time) return;
        onChange((previous) =>
          previous ? { ...previous, startsAt: time } : previous,
        );
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
        onChange((previous) =>
          previous ? { ...previous, startsAt: date } : previous,
        );
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
  const linkTypeError =
    linkUrl.trim().length > 0 && validateSessionUrl(linkUrl) === null;

  return (
    <GameBottomSheet
      visible={sessionForm !== null}
      onClose={onClose}
      name="SessionFormSheet"
      file={SHEET_FILE}
    >
      <CustomText style={styles.sheetTitle}>{t("social.sessions.schedule")}</CustomText>
      {sessionForm && (
        <>
          <CustomText style={styles.muted}>{t("social.chats.conversation")}</CustomText>
          {conversations.length === 0 ? (
            <CustomText style={styles.muted}>
              {t("social.sessions.noChatsYet")}
            </CustomText>
          ) : (
            <View style={styles.subTabs}>
              {conversations.map((conversation) => {
                const active = sessionForm.conversationId === conversation.id;
                const label =
                  conversation.type === "dm"
                    ? (friendProfiles[
                        conversation.members.find((member) => member !== uid) ?? ""
                      ]?.displayName ?? t("social.chats.directMessage"))
                    : (conversation.title ?? t("social.groups.fallback"));
                return (
                  <PressScale
                    key={conversation.id}
                    style={[styles.subTab, active && styles.subTabActive]}
                    onPress={() =>
                      onChange((previous) =>
                        previous
                          ? { ...previous, conversationId: conversation.id }
                          : previous,
                      )
                    }
                  >
                    <CustomText
                      style={[styles.subTabText, active && styles.subTabTextActive]}
                      numberOfLines={1}
                    >
                      {label}
                    </CustomText>
                  </PressScale>
                );
              })}
            </View>
          )}
          <GameSearchField
            selected={
              sessionForm.gameName ? { name: sessionForm.gameName } : null
            }
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
          {showLinkFields && (
            <>
              <CustomText style={styles.muted}>
                {t("social.sessions.links.add")}
              </CustomText>
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
                style={styles.input}
              />
              {linkTypeError && (
                <CustomText style={styles.linkError}>
                  {t("social.sessions.links.invalidUrl")}
                </CustomText>
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
            </>
          )}
          {Platform.OS === "android" && (
            <PressScale style={styles.secondaryButton} onPress={openAndroidDatePicker}>
              <CustomText style={styles.secondaryButtonText}>
                {sessionForm.startsAt.toLocaleString()}
              </CustomText>
            </PressScale>
          )}
          {Platform.OS === "ios" && (
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
          )}
        </>
      )}
      <View style={styles.sheetActions}>
        <PressScale
          style={styles.actionGrow}
          onPress={onSubmit}
          disabled={sessionBusy || !canSubmit}
        >
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
