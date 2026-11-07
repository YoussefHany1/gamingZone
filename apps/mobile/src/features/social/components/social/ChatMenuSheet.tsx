import React from "react";
import { useTranslation } from "react-i18next";
import type { Conversation } from "@gaming-zone/core";
import type { ConversationUserState } from "../../hooks/useConversationList";
import GameBottomSheet from "../GameBottomSheet";
import PillButton from "../common/PillButton";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

export type ChatMenuSheetProps = {
  conversation: Conversation | null;
  state: ConversationUserState | undefined;
  busy: boolean;
  uid: string;
  onClose: () => void;
  onToggleMuted: (conversationId: string) => void;
  onToggleArchived: (conversationId: string) => void;
  onLeaveGroup: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  /** Opens the GroupSettingsSheet (admin-only, checked here via uid). */
  onOpenSettings: (conversationId: string) => void;
};

export default function ChatMenuSheet({
  conversation,
  state,
  busy,
  uid,
  onClose,
  onToggleMuted,
  onToggleArchived,
  onOpenSettings,
  onLeaveGroup,
  onDelete,
}: ChatMenuSheetProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <GameBottomSheet
      visible={conversation !== null}
      onClose={onClose}
      name="ChatMenuSheet"
      file={SHEET_FILE}
    >
      {conversation && (
        <>
          <PillButton
            variant="menu"
            label={state?.muted ? t("social.chats.unmute") : t("social.chats.mute")}
            onPress={() => onToggleMuted(conversation.id)}
            disabled={busy}
          />
          <PillButton
            variant="menu"
            label={state?.archived ? t("social.chats.unarchive") : t("social.chats.archive")}
            onPress={() => onToggleArchived(conversation.id)}
            disabled={busy}
          />
          {conversation.type === "group" && conversation.admins.includes(uid) && (
            <PillButton
              variant="menu"
              label={t("social.groups.settings")}
              onPress={() => onOpenSettings(conversation.id)}
            />
          )}
          {conversation.type === "group" && conversation.members.length > 0 && (
            <PillButton
              variant="menu"
              label={t("social.chats.leaveGroup")}
              onPress={() => onLeaveGroup(conversation.id)}
            />
          )}
          <PillButton
            variant="menu"
            tone="danger"
            label={t("social.chats.delete")}
            onPress={() => onDelete(conversation.id)}
          />
        </>
      )}
    </GameBottomSheet>
  );
}
