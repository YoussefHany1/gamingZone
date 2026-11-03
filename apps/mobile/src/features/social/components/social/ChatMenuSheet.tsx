import React from "react";
import { useTranslation } from "react-i18next";
import type { Conversation } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { ConversationUserState } from "../../hooks/useConversationList";
import GameBottomSheet from "../GameBottomSheet";
import PressScale from "../PressScale";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

type ChatMenuSheetProps = {
  conversation: Conversation | null;
  state: ConversationUserState | undefined;
  busy: boolean;
  uid: string;
  onClose: () => void;
  onOpen: (conversationId: string) => void;
  onToggleMuted: (conversationId: string) => void;
  onToggleArchived: (conversationId: string) => void;
  onLeaveGroup: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  /** Opens the GroupSettingsSheet (admin-only, checked by the caller via uid). */
  onOpenSettings: (conversationId: string) => void;
};

export default function ChatMenuSheet({
  conversation,
  state,
  busy,
  uid,
  onClose,
  onOpen,
  onToggleMuted,
  onToggleArchived,
  onLeaveGroup,
  onDelete,
  onOpenSettings,
}: ChatMenuSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: "900", marginBottom: 14 },
    groupCreate: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 12,
      borderRadius: 11,
      backgroundColor: c.accent,
      marginBottom: 14,
    },
    actionText: { color: c.onAccent, fontSize: 12, fontWeight: "800" },
    dangerAction: { backgroundColor: c.danger },
  }));

  return (
    <GameBottomSheet
      visible={conversation !== null}
      onClose={onClose}
      name="ChatMenuSheet"
      file={SHEET_FILE}
    >
      {conversation && (
        <>
          <CustomText style={styles.sheetTitle}>{t("social.chats.conversation")}</CustomText>
          <PressScale style={styles.groupCreate} onPress={() => onOpen(conversation.id)}>
            <CustomText style={styles.actionText}>{t("social.chats.open")}</CustomText>
          </PressScale>
          <PressScale
            style={styles.groupCreate}
            onPress={() => onToggleMuted(conversation.id)}
            disabled={busy}
          >
            <CustomText style={styles.actionText}>
              {state?.muted ? t("social.chats.unmute") : t("social.chats.mute")}
            </CustomText>
          </PressScale>
          <PressScale
            style={styles.groupCreate}
            onPress={() => onToggleArchived(conversation.id)}
            disabled={busy}
          >
            <CustomText style={styles.actionText}>
              {state?.archived ? t("social.chats.unarchive") : t("social.chats.archive")}
            </CustomText>
          </PressScale>
          {conversation.type === "group" &&
            conversation.admins.includes(uid) && (
              <PressScale
                style={styles.groupCreate}
                onPress={() => onOpenSettings(conversation.id)}
              >
                <CustomText style={styles.actionText}>
                  {t("social.groups.settings")}
                </CustomText>
              </PressScale>
            )}
          {conversation.type === "group" && conversation.members.length > 0 && (
            <PressScale style={styles.groupCreate} onPress={() => onLeaveGroup(conversation.id)}>
              <CustomText style={styles.actionText}>{t("social.chats.leaveGroup")}</CustomText>
            </PressScale>
          )}
          <PressScale
            style={[styles.groupCreate, styles.dangerAction]}
            onPress={() => onDelete(conversation.id)}
          >
            <CustomText style={styles.actionText}>{t("social.chats.delete")}</CustomText>
          </PressScale>
        </>
      )}
    </GameBottomSheet>
  );
}
