import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Conversation } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useChatProfiles } from "../../hooks/useChatProfiles";
import GameBottomSheet from "../GameBottomSheet";
import PillButton from "../common/PillButton";
import SheetTitle from "../common/SheetTitle";
import SocialListRow from "../SocialListRow";
import type { GroupFriend } from "../GroupCreateSheet";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

/** The tight row-level pill variant (slightly shorter than the inline one). */
const ROW_PILL_STYLE = { minHeight: 34, borderRadius: 10 } as const;

export type GroupSettingsSheetProps = {
  /** Group being edited (or null while closed). */
  conversation: Conversation | null;
  uid: string;
  /** Viewer's friends — the candidate pool for the add-member picker. */
  friends: GroupFriend[];
  busy: boolean;
  onClose: () => void;
  onRename: (conversationId: string, title: string) => void;
  onRemoveMember: (conversationId: string, memberUid: string) => void;
  onAddMember: (conversationId: string, memberUid: string) => void;
};

/**
 * Group management screen-in-a-sheet: rename (admin), member list with
 * per-row removal (admin) and an add-member picker over the viewer's
 * friends. Non-admins only ever see the read-only member list.
 */
export default function GroupSettingsSheet({
  conversation,
  uid,
  friends,
  busy,
  onClose,
  onRename,
  onRemoveMember,
  onAddMember,
}: GroupSettingsSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [title, setTitle] = useState("");

  // Re-seed the input whenever a different conversation opens. The memoized
  // `conversation` object keeps this cheap and avoids mid-edit clobbering.
  const conversationId = conversation?.id ?? "";
  useEffect(() => {
    setTitle(conversation?.title ?? "");
  }, [conversationId, conversation]);

  const profiles = useChatProfiles(conversation?.members ?? []);
  const isAdmin = conversation?.admins.includes(uid) ?? false;
  // The backend refuses to shrink a group below two members — hide the
  // buttons in that edge case instead of inviting a guaranteed error.
  const canRemoveMember = conversation !== null && conversation.members.length > 2;

  const addableFriends = friends.filter(
    (friend) => conversation && !conversation.members.includes(friend.uid),
  );

  const canRename = isAdmin && title.trim().length > 0 && title !== conversation?.title;

  const styles = useThemeStyles((c) => ({
    muted: { color: c.textMuted, fontSize: 12, marginTop: 3, marginBottom: 8 },
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
  }));

  return (
    <GameBottomSheet
      visible={conversation !== null}
      onClose={onClose}
      name="GroupSettingsSheet"
      file={SHEET_FILE}
    >
      {conversation && (
        <>
          <SheetTitle title={t("social.groups.settings")} />

          {isAdmin && (
            <>
              <CustomTextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t("social.groups.name")}
                placeholderTextColor={colors.textMuted}
                maxLength={80}
                style={styles.input}
              />
              <PillButton
                variant="menu"
                label={busy ? t("social.sessions.saving") : t("common.save")}
                onPress={() => onRename(conversation.id, title)}
                disabled={busy || !canRename}
              />
            </>
          )}

          <CustomText style={styles.muted}>
            {t("social.chats.groupMembers", { count: conversation.members.length })}
          </CustomText>
          {conversation.members.map((member) => (
            <SocialListRow
              key={member}
              photoURL={profiles[member]?.photoURL}
              label={profiles[member]?.displayName ?? t("social.groups.fallback")}
              selected={false}
              onPress={undefined}
              trailing={
                isAdmin && canRemoveMember && member !== uid ? (
                  <PillButton
                    tone="danger-outline"
                    label={t("social.groups.remove")}
                    onPress={() => onRemoveMember(conversation.id, member)}
                    disabled={busy}
                    style={ROW_PILL_STYLE}
                  />
                ) : null
              }
            />
          ))}

          {isAdmin && addableFriends.length > 0 && (
            <>
              <CustomText style={styles.muted}>{t("social.groups.addMember")}</CustomText>
              {addableFriends.map((friend) => (
                <SocialListRow
                  key={friend.uid}
                  photoURL={friend.photoURL}
                  label={friend.displayName}
                  selected={false}
                  onPress={() => onAddMember(conversation.id, friend.uid)}
                  trailing={
                    <PillButton
                      tone="secondary"
                      label={t("social.groups.add")}
                      onPress={() => onAddMember(conversation.id, friend.uid)}
                      disabled={busy}
                      style={ROW_PILL_STYLE}
                    />
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </GameBottomSheet>
  );
}
