import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation } from "@gaming-zone/core";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";
import { showConfirmAlert } from "../lib/confirmDialog";
import {
  hideConversation,
  listenToReadPosition,
  setConversationArchived,
  setConversationMuted,
} from "../lib/chatService";
import { leaveGroupConversation } from "../lib/friendService";
import type { ConversationUserState } from "./useConversationList";

/** A stand-in conversation when only the id is known (gone/stale lists). */
export function fallbackConversation(conversationId: string): Conversation {
  return {
    id: conversationId,
    type: "dm",
    title: null,
    photoURL: null,
    members: [],
    admins: [],
    dmKey: null,
    lastMessage: null,
    lastMessageAt: null,
  };
}

export type UseChatMenuArgs = {
  uid: string;
  /**
   * Resolves the Conversation for the open id. The social list finds it in
   * its conversations array (with the stale-id fallback); the chat screen
   * builds it from its own conversation details.
   */
  resolveConversation: (conversationId: string) => Conversation;
  /**
   * Muted/archived map consulted instead of an extra Firestore listener —
   * the social list already keeps this fresh for every conversation. When
   * omitted (chat screen), the hook listens to the user's read position
   * while the sheet is open.
   */
  userStates?: Record<string, ConversationUserState>;
  /** Runs after a leave completes and the sheet is closed (e.g. goBack). */
  onLeft?: () => void;
  /** Runs after a delete completes and the sheet is closed (e.g. goBack). */
  onDeleted?: () => void;
};

export type ChatMenu = {
  /** Id of the conversation whose menu sheet is open, or null. */
  id: string | null;
  openMenu: (conversationId: string) => void;
  closeMenu: () => void;
  conversation: Conversation | null;
  state: ConversationUserState | undefined;
  busy: boolean;
  toggleMuted: (conversationId: string) => void;
  toggleArchived: (conversationId: string) => void;
  leaveGroup: (conversationId: string) => void;
  /** Confirm alert + delete-for-me. */
  delete: (conversationId: string) => void;
};

/**
 * The chat-menu sheet state machine, shared by the social list and the chat
 * screen: open state, conversation resolution, the viewer's muted/archived
 * state, and the toggle / leave / delete actions behind it.
 */
export function useChatMenu({
  uid,
  resolveConversation,
  userStates,
  onLeft,
  onDeleted,
}: UseChatMenuArgs): ChatMenu {
  const { t } = useTranslation();
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Listener-sourced state (chat screen): the social list supplies the map
  // instead, in which case no extra subscription is opened.
  const [listenedState, setListenedState] = useState<ConversationUserState | undefined>(
    undefined,
  );
  useEffect(() => {
    if (userStates !== undefined) return;
    if (!id) return;
    return listenToReadPosition(
      id,
      uid,
      (position) =>
        setListenedState({
          lastReadAt: position.lastReadAt,
          muted: position.muted === true,
          archived: position.archived === true,
          deletedAt: position.deletedAt ?? null,
        }),
      (error) => logger.warn("[social] Failed to load chat menu state", error),
    );
  }, [id, uid, userStates]);

  const closeMenu = useCallback(() => setId(null), []);
  const openMenu = useCallback((nextId: string) => setId(nextId), []);

  const conversation = useMemo(
    () => (id ? resolveConversation(id) : null),
    [id, resolveConversation],
  );
  const state =
    userStates !== undefined && id !== null ? userStates[id] : listenedState;

  const toggleMuted = useCallback(
    (conversationId: string) => {
      const muted = state?.muted === true;
      setBusy(true);
      void setConversationMuted(conversationId, uid, !muted).finally(() =>
        setBusy(false),
      );
      closeMenu();
    },
    [state, uid, closeMenu],
  );

  const toggleArchived = useCallback(
    (conversationId: string) => {
      const archived = state?.archived === true;
      setBusy(true);
      void setConversationArchived(conversationId, uid, !archived).finally(() =>
        setBusy(false),
      );
      closeMenu();
    },
    [state, uid, closeMenu],
  );

  const leaveGroup = useCallback(
    (conversationId: string) => {
      void leaveGroupConversation(conversationId).then(() => {
        closeMenu();
        onLeft?.();
      });
    },
    [closeMenu, onLeft],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      showConfirmAlert({
        title: t("social.chats.delete"),
        confirmLabel: t("common.save"),
        cancelLabel: t("common.cancel"),
        onConfirm: () => {
          void hideConversation(conversationId, uid).then(() => {
            closeMenu();
            onDeleted?.();
          });
        },
      });
    },
    [t, uid, closeMenu, onDeleted],
  );

  return {
    id,
    openMenu,
    closeMenu,
    conversation,
    state,
    busy,
    toggleMuted,
    toggleArchived,
    leaveGroup,
    delete: deleteConversation,
  };
}
