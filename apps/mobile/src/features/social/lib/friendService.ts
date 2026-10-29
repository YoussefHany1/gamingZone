import firestore from "@react-native-firebase/firestore";
import type { FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import { callSocialApi, callSocialApiGet } from "./socialApi";

export async function getOrCreateDirectConversation(uid: string): Promise<string> {
  const result = await callSocialApi<{ conversationId: string }>(
    "/social/conversations/dm",
    { uid },
  );
  return result.conversationId;
}

export type FriendProfile = ProfileSearchHit & { id: string };

export function listenToFriendships(
  uid: string,
  onChange: (items: Friendship[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return firestore()
    .collection("friendships")
    .where("members", "array-contains", uid)
    .where("status", "==", "active")
    .onSnapshot(
      (snapshot) =>
        onChange(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Friendship, "id">),
          })),
        ),
      onError,
    );
}

export function listenToIncomingRequests(
  uid: string,
  onChange: (items: FriendRequest[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return firestore()
    .collection("friendRequests")
    .where("to", "==", uid)
    .where("status", "==", "pending")
    .onSnapshot(
      (snapshot) =>
        onChange(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<FriendRequest, "id">),
          })),
        ),
      onError,
    );
}

export async function searchProfiles(query: string): Promise<ProfileSearchHit[]> {
  const result = await callSocialApiGet<{ results: ProfileSearchHit[] }>(
    `/social/search?q=${encodeURIComponent(query)}`,
  );
  return result.results ?? [];
}

export const sendFriendRequest = (uid: string) =>
  callSocialApi("/social/friends/request", { uid });
export const respondFriendRequest = (from: string, action: "accept" | "decline") =>
  callSocialApi("/social/friends/respond", { from, action });
export const cancelFriendRequest = (to: string) =>
  callSocialApi("/social/friends/cancel", { to });
export const removeFriend = (uid: string) =>
  callSocialApi("/social/friends/remove", { uid });
export const blockUser = (uid: string) =>
  callSocialApi("/social/blocks", { uid, action: "block" });
export const unblockUser = (uid: string) =>
  callSocialApi("/social/blocks", { uid, action: "unblock" });
