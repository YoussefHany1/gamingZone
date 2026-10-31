import { useCallback, useEffect, useRef, useState } from "react";
import type { SocialMessage } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import {
  listenToMessages,
  loadOlderMessages,
  markConversationRead,
} from "../lib/chatService";

export function useChatMessages(conversationId: string, uid: string) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;

    // Reset before subscribing so the previous conversation's messages are
    // never visible for a frame in the new one.
    setMessages([]);
    setOlderMessages([]);
    setHasOlderMessages(false);
    setLoading(true);
    setLoadError(false);
    loadingOlderRef.current = false;

    const stop = listenToMessages(
      conversationId,
      (next) => {
        setMessages(next);
        setOlderMessages((current) => {
          const newestIds = new Set(next.map((item) => item.id));
          return current.filter((item) => !newestIds.has(item.id));
        });
        setHasOlderMessages((current) => current || next.length === 50);
        setLoading(false);
        setLoadError(false);
        void markConversationRead(conversationId, uid).catch((error) => {
          logger.warn("[social] Failed to mark conversation read", error);
        });
      },
      () => {
        setLoading(false);
        setLoadError(true);
      },
    );
    return stop;
  }, [conversationId, uid]);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasOlderMessages || messages.length === 0) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const cursor =
        olderMessages[olderMessages.length - 1] ?? messages[messages.length - 1];
      if (!cursor) return;

      const older = await loadOlderMessages(conversationId, cursor);
      // The conversation can change while the page is in flight; discard the
      // page rather than appending it to a different thread.
      if (conversationIdRef.current !== conversationId) return;

      setOlderMessages((current) => [...current, ...older]);
      setHasOlderMessages(older.length === 50);
    } catch (error) {
      // Only the initial listener failure is fatal for the screen; a failed
      // page keeps the existing messages visible and can be retried.
      logger.warn("[social] Failed to load older messages", error);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [conversationId, hasOlderMessages, messages, olderMessages]);

  return {
    messages,
    olderMessages,
    loading,
    loadError,
    hasOlderMessages,
    loadingOlder,
    loadOlder,
  };
}
