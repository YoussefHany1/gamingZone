import firestore from "@react-native-firebase/firestore";
import type { Conversation, ReadPosition, SocialMessage } from "@gaming-zone/core";
import { dmKey, timestampToMillis } from "@gaming-zone/core";
import { callSocialApi } from "./socialApi";

export function directConversationId(uidA: string, uidB: string): string {
  return dmKey(uidA, uidB);
}

function mapMessage(id: string, data: Record<string, unknown>): SocialMessage {
  return {
    ...(data as Omit<SocialMessage, "id" | "createdAt" | "editedAt" | "deletedAt">),
    id,
    createdAt: timestampToMillis(data.createdAt),
    editedAt: timestampToMillis(data.editedAt),
    deletedAt: timestampToMillis(data.deletedAt),
  };
}

type RawLastMessage = Omit<NonNullable<Conversation["lastMessage"]>, "createdAt"> & {
  createdAt?: unknown;
};

/**
 * `Conversation` is a millis-based model, but Firestore stores `Timestamp`
 * objects. Every read path must go through this mapper or `relativeTime` and
 * the unread comparison receive a `Timestamp` where they expect a number.
 */
function mapConversation(id: string, data: Record<string, unknown>): Conversation {
  const lastMessage = (data.lastMessage ?? null) as RawLastMessage | null;
  return {
    ...(data as Omit<Conversation, "id" | "lastMessage" | "lastMessageAt">),
    id,
    lastMessage: lastMessage
      ? { ...lastMessage, createdAt: timestampToMillis(lastMessage.createdAt) }
      : null,
    lastMessageAt: timestampToMillis(data.lastMessageAt),
  };
}

function mapReadPosition(data: Record<string, unknown> | undefined): ReadPosition {
  return {
    lastReadAt: timestampToMillis(data?.lastReadAt),
    muted: data?.muted === true,
    archived: data?.archived === true,
    deletedAt: timestampToMillis(data?.deletedAt),
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  game?: { id: string | number; name: string; coverImageId?: string | null },
): Promise<void> {
  await callSocialApi("/social/messages", { conversationId, text, ...(game ? { game } : {}) });
}

export function listenToConversations(
  uid: string,
  onChange: (items: Conversation[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return firestore()
    .collection("conversations")
    .where("members", "array-contains", uid)
    .orderBy("lastMessageAt", "desc")
    .onSnapshot(
      (snapshot) => onChange(snapshot.docs.map((item) => mapConversation(item.id, item.data()))),
      onError,
    );
}

export async function loadOlderMessages(
  conversationId: string,
  cursor: SocialMessage,
): Promise<SocialMessage[]> {
  if (cursor.createdAt === null) return [];
  const snapshot = await firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .orderBy(firestore.FieldPath.documentId(), "desc")
    .startAfter(firestore.Timestamp.fromMillis(cursor.createdAt), cursor.id)
    .limit(50)
    .get();
  return snapshot.docs.map((item) => mapMessage(item.id, item.data()));
}

export function listenToMessages(
  conversationId: string,
  onChange: (items: SocialMessage[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .orderBy(firestore.FieldPath.documentId(), "desc")
    .limit(50)
    .onSnapshot(
      (snapshot) =>
        onChange(snapshot.docs.map((item) => mapMessage(item.id, item.data()))),
      onError,
    );
}

export function listenToReadPosition(
  conversationId: string,
  uid: string,
  onChange: (position: ReadPosition) => void,
  onError: (error: unknown) => void,
): () => void {
  return firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("reads")
    .doc(uid)
    .onSnapshot(
      (snapshot) => onChange(mapReadPosition(snapshot?.data())),
      onError,
    );
}

export async function markConversationRead(
  conversationId: string,
  uid: string,
): Promise<void> {
  await firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("reads")
    .doc(uid)
    .set({ lastReadAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
}

export async function setConversationMuted(
  conversationId: string,
  uid: string,
  muted: boolean,
): Promise<void> {
  await firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("reads")
    .doc(uid)
    .set({ muted }, { merge: true });
}

export async function setConversationArchived(
  conversationId: string,
  uid: string,
  archived: boolean,
): Promise<void> {
  await firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("reads")
    .doc(uid)
    .set({ archived }, { merge: true });
}

export async function hideConversation(conversationId: string, uid: string): Promise<void> {
  await firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("reads")
    .doc(uid)
    .set({ deletedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
}

export async function unhideConversation(conversationId: string, uid: string): Promise<void> {
  await firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("reads")
    .doc(uid)
    .set({ deletedAt: null }, { merge: true });
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  text: string,
): Promise<void> {
  await callSocialApi("/social/messages/action", {
    conversationId,
    messageId,
    action: "edit",
    text,
  });
}

export async function deleteMessageForMe(
  conversationId: string,
  messageId: string,
): Promise<void> {
  await callSocialApi("/social/messages/action", {
    conversationId,
    messageId,
    action: "delete",
  });
}
