import firestore from "@react-native-firebase/firestore";
import type { Conversation, ReadPosition, SocialMessage } from "@gaming-zone/core";
import { dmKey } from "@gaming-zone/core";
import { callSocialApi } from "./socialApi";

export function directConversationId(uidA: string, uidB: string): string {
  return dmKey(uidA, uidB);
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<void> {
  await callSocialApi("/social/messages", { conversationId, text });
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
    .limit(50)
    .onSnapshot(
      (snapshot) =>
        onChange(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<SocialMessage, "id">),
          })),
        ),
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
