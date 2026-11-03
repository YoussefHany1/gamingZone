import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Conversation } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useChatProfiles } from "../../hooks/useChatProfiles";
import GameBottomSheet from "../GameBottomSheet";
import PressScale from "../PressScale";
import SocialListRow from "../SocialListRow";
import type { GroupFriend } from "../GroupCreateSheet";

const SHEET_FILE = "src/features/social/screens/SocialScreen.tsx";

type GroupSettingsSheetProps = {
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
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: "900", marginBottom: 14 },
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
    sectionAction: {
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
    sectionActionText: { color: c.onAccent, fontSize: 12, fontWeight: "800" },
    rowAction: {
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    rowActionText: { color: c.text, fontSize: 12, fontWeight: "700" },
    rowActionDanger: { borderColor: c.danger },
    rowActionDangerText: { color: c.danger },
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
          <CustomText style={styles.sheetTitle}>
            {t("social.groups.settings")}
          </CustomText>

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
              <PressScale
                style={styles.sectionAction}
                onPress={() => onRename(conversation.id, title)}
                disabled={busy || !canRename}
              >
                <CustomText style={styles.sectionActionText}>
                  {busy ? t("social.sessions.saving") : t("common.save")}
                </CustomText>
              </PressScale>
            </>
          )}

          <CustomText style={styles.muted}>
            {t("social.chats.groupMembers", { count: conversation.members.length })}
          </CustomText>
          {conversation.members.map((member) => (
            <SocialListRow
              key={member}
              photoURL={profiles[member]?.photoURL}
              label={
                profiles[member]?.displayName ?? t("social.groups.fallback")
              }
              selected={false}
              onPress={undefined}
              trailing={
                isAdmin && canRemoveMember && member !== uid ? (
                  <PressScale
                    style={[styles.rowAction, styles.rowActionDanger]}
                    onPress={() => onRemoveMember(conversation.id, member)}
                    disabled={busy}
                  >
                    <CustomText style={[styles.rowActionText, styles.rowActionDangerText]}>
                      {t("social.groups.remove")}
                    </CustomText>
                  </PressScale>
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
                    <PressScale
                      style={styles.rowAction}
                      onPress={() => onAddMember(conversation.id, friend.uid)}
                      disabled={busy}
                    >
                      <CustomText style={styles.rowActionText}>
                        {t("social.groups.add")}
                      </CustomText>
                    </PressScale>
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
