import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
} from "firebase/firestore";
import type { Conversation, SocialMessage } from "@gaming-zone/core";
import { db } from "@/lib/firebase";

function millis(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof (value as { toMillis?: unknown } | null)?.toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function mapConversation(id: string, data: DocumentData): Conversation {
  return { id, ...(data as Omit<Conversation, "id">) };
}

function mapMessage(id: string, data: DocumentData): SocialMessage {
  return { id, ...(data as Omit<SocialMessage, "id">) };
}

export function useSocialChats(uid: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<SocialMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, boolean>>({});
  const selectConversation = useCallback((conversationId: string | null) => {
    setSelectedId(conversationId);
    setMessages([]);
    setOlderMessages([]);
    setHasOlderMessages(false);
  }, []);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("members", "array-contains", uid),
      orderBy("lastMessageAt", "desc"),
    );
    return onSnapshot(
      conversationsQuery,
      (snapshot) => setConversations(snapshot.docs.map((item) => mapConversation(item.id, item.data()))),
      () => setError("load"),
    );
  }, [uid]);

  useEffect(() => {
    if (!selectedId) return;
    const messagesQuery = query(
      collection(db, "conversations", selectedId, "messages"),
      orderBy("createdAt", "desc"),
      orderBy("__name__", "desc"),
      limit(50),
    );
    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        const newest = snapshot.docs.map((item) => mapMessage(item.id, item.data()));
        setMessages(newest);
        setOlderMessages((current) => {
          const newestIds = new Set(newest.map((item) => item.id));
          return current.filter((item) => !newestIds.has(item.id));
        });
        setHasOlderMessages((currentHasOlder) => currentHasOlder || snapshot.size === 50);
      },
      () => setError("load"),
    );
  }, [selectedId]);

  const loadOlderMessages = async () => {
    if (!selectedId || loadingOlder || !hasOlderMessages || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = olderMessages[olderMessages.length - 1] ?? messages[messages.length - 1];
      if (!oldest) return;
      const olderQuery = query(
        collection(db, "conversations", selectedId, "messages"),
        orderBy("createdAt", "desc"),
        orderBy("__name__", "desc"),
        startAfter(oldest.createdAt, oldest.id),
        limit(50),
      );
      const snapshot = await getDocs(olderQuery);
      setOlderMessages((current) => [...current, ...snapshot.docs.map((item) => mapMessage(item.id, item.data()))]);
      setHasOlderMessages(snapshot.size === 50);
    } catch {
      setError("load");
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    if (!uid || conversations.length === 0) return;
    const stops = conversations.map((conversation) =>
      onSnapshot(
        doc(db, "conversations", conversation.id, "reads", uid),
        (snapshot) => {
          const lastReadAt = millis(snapshot.data()?.lastReadAt);
          const lastMessageAt = millis(conversation.lastMessageAt);
          setUnread((previous) => ({
            ...previous,
            [conversation.id]: Boolean(
              conversation.lastMessage &&
                conversation.lastMessage.senderId !== uid &&
                lastMessageAt !== null &&
                (lastReadAt === null || lastMessageAt > lastReadAt),
            ),
          }));
        },
        () => undefined,
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, [uid, conversations]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  return {
    conversations,
    messages: [...messages, ...olderMessages],
    hasOlderMessages,
    loadingOlder,
    loadOlderMessages,
    selectedId,
    selectedConversation,
    unread,
    error,
    selectConversation,
  };
}
