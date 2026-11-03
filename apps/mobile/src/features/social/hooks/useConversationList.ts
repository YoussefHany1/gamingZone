import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, ReadPosition } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import { listenToConversations, listenToReadPosition } from "../lib/chatService";

export type ConversationUserState = {
  lastReadAt: number | null;
  muted: boolean;
  archived: boolean;
  deletedAt: number | null;
};

export type ConversationListResult = {
  conversations: Conversation[];
  /** `lastReadAt` per conversation id, in millis (derived). */
  readAt: Record<string, number | null>;
  /** Per-user state per conversation id. */
  userState: Record<string, ConversationUserState>;
};

const ID_SEPARATOR = "\n";

/**
 * Conversation list plus the per-conversation read positions.
 *
 * Read positions are listened to one document at a time, so the subscriptions
 * are diffed against the conversation ids: an updated message or title on one
 * conversation no longer tears down and recreates every listener.
 */
export function useConversationList(uid: string): ConversationListResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [positions, setPositions] = useState<Record<string, ReadPosition>>({});
  const readStops = useRef(new Map<string, () => void>());

  const stopReadListeners = useCallback(() => {
    for (const stop of readStops.current.values()) stop();
    readStops.current.clear();
  }, []);

  useEffect(() => {
    // A new account must never inherit the previous account's list or reads.
    setConversations([]);
    setPositions({});
    stopReadListeners();

    if (!uid) return;

    return listenToConversations(uid, setConversations, (error) =>
      logger.warn("[social] Conversations unavailable", error),
    );
  }, [uid, stopReadListeners]);

  useEffect(() => stopReadListeners, [stopReadListeners]);

  const idsKey = conversations.map((conversation) => conversation.id).join(ID_SEPARATOR);

  useEffect(() => {
    if (!uid) return;

    const ids = idsKey ? idsKey.split(ID_SEPARATOR) : [];
    const wanted = new Set(ids);

    for (const [id, stop] of readStops.current) {
      if (wanted.has(id)) continue;
      stop();
      readStops.current.delete(id);
    }

    for (const id of ids) {
      if (readStops.current.has(id)) continue;
      const stop = listenToReadPosition(
        id,
        uid,
        (position: ReadPosition) => {
          setPositions((previous) => {
            const prev = previous[id];
            if (
              prev?.lastReadAt === position.lastReadAt &&
              prev?.muted === position.muted &&
              prev?.archived === position.archived &&
              prev?.deletedAt === position.deletedAt
            ) {
              return previous;
            }
            return { ...previous, [id]: position };
          });
        },
        (error) => logger.warn(`[social] Read state unavailable for ${id}`, error),
      );
      readStops.current.set(id, stop);
    }

    setPositions((previous) => {
      const previousIds = Object.keys(previous);
      if (
        previousIds.length === wanted.size &&
        previousIds.every((id) => wanted.has(id))
      ) {
        return previous;
      }
      const next: Record<string, ReadPosition> = {};
      for (const id of ids) {
        if (id in previous) next[id] = previous[id]!;
      }
      return next;
    });
  }, [uid, idsKey]);

  const readAt = useMemo(() => {
    const result: Record<string, number | null> = {};
    for (const [id, position] of Object.entries(positions)) {
      result[id] = position.lastReadAt;
    }
    return result;
  }, [positions]);

  const userState = useMemo(() => {
    const result: Record<string, ConversationUserState> = {};
    for (const [id, position] of Object.entries(positions)) {
      result[id] = {
        lastReadAt: position.lastReadAt,
        muted: position.muted === true,
        archived: position.archived === true,
        deletedAt: position.deletedAt ?? null,
      };
    }
    return result;
  }, [positions]);

  return { conversations, readAt, userState };
}