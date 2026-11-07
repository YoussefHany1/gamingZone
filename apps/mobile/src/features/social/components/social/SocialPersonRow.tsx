import React from "react";
import { MessageSquare, Check, X, UserPlus, MoreVertical } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Conversation, FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import { useThemeColors } from "@/src/hooks/useTheme";
import SocialListRow from "../SocialListRow";
import PillButton from "../common/PillButton";
import { relativeTime } from "../../lib/relativeTime";
import type { ListRelation } from "../../lib/socialList";
import type { PresenceEntry } from "../../hooks/useSocialPresence";

type RowItem = ProfileSearchHit | FriendRequest | Friendship | Conversation;

type SocialPersonRowProps = {
  item: RowItem;
  isSearching: boolean;
  uid: string;
  friendProfiles: Record<string, { displayName?: string; handle?: string; photoURL?: string | null; statusText?: string; platform?: string } | undefined>;
  relationByUid: Map<string, ListRelation>;
  unreadCounts: Record<string, number>;
  /** Muted state per conversation, for showing the mute icon in the chats tab. */
  mutedConversationIds?: Set<string>;
  /** Presence map from `useSocialPresence` (friends scene only, may be empty). */
  presenceByUid?: Record<string, PresenceEntry> | undefined;
  i18nLang: string;
  onOpenProfile: (uid?: string) => void;
  onOpenChat: (conversationId: string) => void;
  onOpenDirectMessage: (targetUid: string) => void;
  onFriendMenu: (uid: string | null) => void;
  onChatMenu: (conversationId: string | null) => void;
  onRespond: (uid: string, action: "accept" | "decline") => void;
  onCancelRequest: (uid: string) => void;
  onSendRequest: (uid: string) => void;
};

export default function SocialPersonRow({
  item,
  isSearching,
  uid,
  friendProfiles,
  relationByUid,
  unreadCounts,
  mutedConversationIds,
  presenceByUid,
  i18nLang,
  onOpenProfile,
  onOpenChat,
  onOpenDirectMessage,
  onFriendMenu,
  onChatMenu,
  onRespond,
  onCancelRequest,
  onSendRequest,
}: SocialPersonRowProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const isConversation = "type" in item && (item.type === "dm" || item.type === "group");
  let label = t("social.players.fallback");
  let subtitle = "";
  let photoURL: string | null | undefined;
  let targetUid: string | undefined;

  if (isSearching && "handle" in item) {
    label = `@${item.handle}`;
    subtitle = item.displayName;
    photoURL = item.photoURL;
    targetUid = item.uid;
  } else if ("from" in item) {
    const sentByMe = item.from === uid;
    const requestTarget = sentByMe ? item.to : item.from;
    const profile = friendProfiles[requestTarget];
    photoURL = profile?.photoURL;
    label = profile?.displayName ?? t("social.players.fallback");
    subtitle = profile?.handle ? `@${profile.handle}` : "";
    targetUid = requestTarget;
  } else if (isConversation) {
    if (item.type === "dm") {
      targetUid = item.members.find((member) => member !== uid);
      const profile = targetUid ? friendProfiles[targetUid] : undefined;
      photoURL = profile?.photoURL;
      label = profile?.displayName ?? t("social.players.fallback");
    } else {
      label = item.title ?? t("social.groups.fallback");
      subtitle = item.lastMessage?.text ?? t("social.chats.noMessages");
    }
  } else if ("members" in item) {
    targetUid = item.members.find((member) => member !== uid);
    const profile = targetUid ? friendProfiles[targetUid] : undefined;
    photoURL = profile?.photoURL;
    label = profile?.displayName ?? t("social.players.fallback");
    subtitle =
      profile?.statusText ||
      (profile?.handle ? `@${profile.handle}` : profile?.platform || "");
  }

  const onRow = () =>
    isConversation ? onOpenChat(item.id) : onOpenProfile(targetUid);

  const meta =
    isConversation && item.lastMessageAt
      ? relativeTime(item.lastMessageAt, i18nLang)
      : null;

  const unreadCount = isConversation ? (unreadCounts[item.id] ?? 0) : 0;
  // Presence dots only make sense for people the viewer can message freely —
  // friend rows in the friends list. Requests and search hits stay unbiased.
  const targetPresence = presenceByUid?.[targetUid ?? ""];
  const online =
    !isSearching && !isConversation && "members" in item
      ? (targetPresence?.online ?? false)
      : false;

  const actions =
    isSearching && "uid" in item && targetUid !== uid ? (
      relationByUid.get(item.uid) === "friends" ? (
        <PillButton onPress={() => onOpenDirectMessage(item.uid)}>
          <MessageSquare size={16} color={colors.onAccent} />
        </PillButton>
      ) : relationByUid.get(item.uid) === "received" ? (
        <PillButton onPress={() => onRespond(item.uid, "accept")}>
          <Check size={16} color={colors.onAccent} />
        </PillButton>
      ) : relationByUid.get(item.uid) === "sent" ? (
        <PillButton tone="danger" onPress={() => onCancelRequest(item.uid)}>
          <X size={16} color={colors.onAccent} />
        </PillButton>
      ) : (
        <PillButton onPress={() => onSendRequest(item.uid)}>
          <UserPlus size={16} color={colors.onAccent} />
        </PillButton>
      )
    ) : !isSearching && "members" in item && !isConversation ? (
      <>
        <PillButton onPress={() => onOpenDirectMessage(targetUid ?? "")}>
          <MessageSquare size={16} color={colors.onAccent} />
        </PillButton>
        <PillButton tone="secondary" onPress={() => onFriendMenu(targetUid ?? null)}>
          <MoreVertical size={16} color={colors.text} />
        </PillButton>
      </>
    ) : !isSearching && isConversation ? (
      <PillButton tone="secondary" onPress={() => onChatMenu(item.id)}>
        <MoreVertical size={16} color={colors.text} />
      </PillButton>
    ) : !isSearching && "from" in item && !isConversation ? (
      item.from !== uid ? (
        <>
          <PillButton onPress={() => onRespond(item.from, "accept")}>
            <Check size={16} color={colors.onAccent} />
          </PillButton>
          <PillButton tone="danger" onPress={() => onRespond(item.from, "decline")}>
            <X size={16} color={colors.onAccent} />
          </PillButton>
        </>
      ) : (
        <PillButton tone="danger" onPress={() => onCancelRequest(item.to)}>
          <X size={16} color={colors.onAccent} />
        </PillButton>
      )
    ) : null;

  return (
    <SocialListRow
      photoURL={photoURL}
      label={label}
      subtitle={subtitle}
      meta={meta}
      unreadCount={unreadCount}
      subtitleBold={isConversation && unreadCount > 0}
      muted={isConversation && !!mutedConversationIds?.has(item.id)}
      conversation={isConversation}
      online={online}
      onPress={onRow}
      disabled={!isConversation && !targetUid}
      trailing={actions}
    />
  );
}
