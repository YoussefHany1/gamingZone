import firestore from "@react-native-firebase/firestore";
import type { Conversation, ReadPosition, SocialMessage } from "@gaming-zone/core";
import { dmKey } from "@gaming-zone/core";
import { callSocialApi } from "./socialApi";

export function directConversationId(uidA: string, uidB: string): string {
  return dmKey(uidA, uidB);
}

/** Firestore stores timestamps as `Timestamp`; the shared model expects millis. */
function toMillis(value: unknown): number | null {
  if (typeof value === "number") return value;
  const candidate = value as { toMillis?: () => number } | null;
  return typeof candidate?.toMillis === "function" ? candidate.toMillis() : null;
}

function mapMessage(id: string, data: Record<string, unknown>): SocialMessage {
  return {
    ...(data as Omit<SocialMessage, "id" | "createdAt" | "editedAt" | "deletedAt">),
    id,
    createdAt: toMillis(data.createdAt),
    editedAt: toMillis(data.editedAt),
    deletedAt: toMillis(data.deletedAt),
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
      (snapshot) =>
        onChange(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<Conversation, "id">),
          })),
        ),
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
      (snapshot) =>
        onChange((snapshot?.data() as ReadPosition | undefined) ?? { lastReadAt: null }),
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

export async function deleteMessageForMe(
  conversationId: string,
  messageId: string,
  uid: string,
): Promise<void> {
  await firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .doc(messageId)
    .update({ deletedFor: firestore.FieldValue.arrayUnion(uid) });
}
