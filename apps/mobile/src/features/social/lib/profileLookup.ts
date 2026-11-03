/**
 * Profile-document → view-model mapping.
 *
 * Both the social list and chat resolve the same `profiles/{uid}` documents
 * one at a time (the collection has no client `list` rule). The two views need
 * different fields, so the mapping is split here instead of being repeated in
 * every hook.
 */
import type { ProfileSearchHit, ProfileStatus } from "@gaming-zone/core";
import { mapStatus } from "@gaming-zone/core";

export type ChatSenderProfile = {
  displayName: string;
  photoURL: string | null;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Search/list summary: identity, avatar and the two public badges. */
export function mapProfileSearchHit(
  uid: string,
  data: Record<string, unknown> | undefined,
): ProfileSearchHit {
  const source = data ?? {};
  return {
    uid,
    handle: asString(source.handle),
    displayName: asString(source.displayName, "Player"),
    photoURL: typeof source.photoURL === "string" ? source.photoURL : null,
    platform: asString(source.platform),
    country: asString(source.country),
  };
}

/** Chat only needs the name and avatar. */
export function mapChatSenderProfile(
  data: Record<string, unknown> | undefined,
): ChatSenderProfile {
  const source = data ?? {};
  return {
    displayName: asString(source.displayName, "Player"),
    photoURL: typeof source.photoURL === "string" ? source.photoURL : null,
  };
}

/** Friends list row: identity plus the profile status text (if any). */
export function mapFriendProfile(
  uid: string,
  data: Record<string, unknown> | undefined,
): ProfileSearchHit & { statusText?: string } {
  const hit = mapProfileSearchHit(uid, data);
  const status = mapStatus((data ?? {}).status);
  return {
    ...hit,
    ...(status?.text ? { statusText: status.text } : {}),
  };
}
