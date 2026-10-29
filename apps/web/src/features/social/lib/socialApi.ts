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

import type { ProfileSearchHit } from "@gaming-zone/core";
