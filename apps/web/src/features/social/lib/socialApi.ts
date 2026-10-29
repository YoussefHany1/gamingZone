import { auth } from "@/lib/firebase";
import { getServerApiUrl } from "@/lib/api-config";

export class SocialApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SocialApiError";
    this.status = status;
    this.code = code;
  }
}

export async function callSocialApi<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous)
    throw new SocialApiError("You must be signed in", 401, "unauthenticated");
  const token = await user.getIdToken();
  const response = await fetch(`${getServerApiUrl()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    code?: string;
  } | null;
  if (!response.ok)
    throw new SocialApiError(
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.code,
    );
  return payload as T;
}

export const sendFriendRequest = (uid: string) =>
  callSocialApi("/social/friends/request", { uid });
export const respondFriendRequest = (
  from: string,
  action: "accept" | "decline",
) => callSocialApi("/social/friends/respond", { from, action });
export const cancelFriendRequest = (to: string) =>
  callSocialApi("/social/friends/cancel", { to });
export const removeFriend = (uid: string) =>
  callSocialApi("/social/friends/remove", { uid });
export const setBlock = (uid: string, action: "block" | "unblock") =>
  callSocialApi("/social/blocks", { uid, action });
export const searchProfiles = (q: string) =>
  callSocialApi<{ results: ProfileSearchHit[] }>(
    `/social/search?q=${encodeURIComponent(q)}`,
  );

export const getOrCreateDirectConversation = (uid: string) =>
  callSocialApi<{ conversationId: string }>("/social/conversations/dm", { uid });

export const sendSocialMessage = (
  conversationId: string,
  text: string,
  game?: { id: string | number; name: string; coverImageId?: string | null },
) =>
  callSocialApi<{ messageId: string }>("/social/messages", {
    conversationId,
    text,
    ...(game ? { game } : {}),
  });

export const createGroupConversation = (title: string, members: string[]) =>
  callSocialApi<{ conversationId: string }>("/social/conversations/group", { title, members });

export const updateGroupMembers = (
  conversationId: string,
  members: string[],
  action: "add" | "remove",
) =>
  callSocialApi("/social/conversations/group/members", { conversationId, members, action });

export const leaveGroupConversation = (conversationId: string) =>
  callSocialApi("/social/conversations/group/leave", { conversationId });

export const createPlaySession = (input: {
  conversationId: string;
  gameId: string | number;
  gameName: string;
}) => callSocialApi<{ sessionId: string }>("/social/sessions", input);

export const respondToSlot = (
  sessionId: string,
  proposalId: string,
  response: "accepted" | "declined",
) => callSocialApi("/social/sessions/respond", { sessionId, proposalId, response });

export const confirmSession = (sessionId: string, proposalId: string) =>
  callSocialApi("/social/sessions/confirm", { sessionId, proposalId });

export const withdrawProposal = (sessionId: string, proposalId: string) =>
  callSocialApi("/social/sessions/withdraw", { sessionId, proposalId });

export const proposeSlot = (sessionId: string, startsAt: number | string, durationMin = 60) =>
  callSocialApi("/social/sessions/propose", { sessionId, startsAt, durationMin });

export const cancelSession = (sessionId: string) =>
  callSocialApi("/social/sessions/cancel", { sessionId });

export const leaveSession = (sessionId: string) =>
  callSocialApi("/social/sessions/leave", { sessionId });

import type { ProfileSearchHit } from "@gaming-zone/core";
