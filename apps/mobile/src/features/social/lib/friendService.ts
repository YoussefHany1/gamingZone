import firestore from "@react-native-firebase/firestore";
import type { FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import { callSocialApi, callSocialApiGet } from "./socialApi";

export async function getOrCreateDirectConversation(uid: string): Promise<string> {
  const result = await callSocialApi<{ conversationId: string }>(
    "/social/conversations/dm",
    { uid },
  );
  return result.conversationId;
}

export async function createGroupConversation(
  title: string,
  members: string[],
): Promise<string> {
  const result = await callSocialApi<{ conversationId: string }>(
    "/social/conversations/group",
    { title, members },
  );
  return result.conversationId;
}

export const leaveGroupConversation = (conversationId: string) =>
  callSocialApi("/social/conversations/group/leave", { conversationId });

/** Admin-only rename / clearable photo change on a group conversation. */
export const updateGroupConversation = (
  conversationId: string,
  input: { title?: string; photoURL?: string | null },
) => callSocialApi("/social/conversations/group/edit", { conversationId, ...input });

/** Admin-only member add/remove (existing `/social/conversations/group/members`). */
export const setGroupMembers = (
  conversationId: string,
  memberUids: string[],
  action: "add" | "remove",
) =>
  callSocialApi("/social/conversations/group/members", {
    conversationId,
    memberUids,
    action,
  });

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

export function listenToSentRequests(
  uid: string,
  onChange: (items: FriendRequest[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return firestore()
    .collection("friendRequests")
    .where("from", "==", uid)
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

/**
 * Count of friends the viewer shares with `profileUid`. Zero on any failure:
 * the UI simply omits the mutual-friends row (the backend already answers
 * `0` when the two users are not active friends).
 */
export async function getMutualFriendCount(profileUid: string): Promise<number> {
  try {
    const result = await callSocialApiGet<{ count?: unknown }>(
      `/social/profile/mutuals/${encodeURIComponent(profileUid)}`,
    );
    const count = result.count;
    return typeof count === "number" && Number.isFinite(count) && count > 0
      ? Math.floor(count)
      : 0;
  } catch (error) {
    logger.warn("[social] Mutual friends count unavailable", error);
    return 0;
  }
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
