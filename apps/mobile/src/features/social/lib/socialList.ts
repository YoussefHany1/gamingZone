import type {
  Conversation,
  FriendRequest,
  Friendship,
  ProfileSearchHit,
} from "@gaming-zone/core";
import type { GroupFriend } from "../components/GroupCreateSheet";
import type { ConversationUserState } from "../hooks/useConversationList";

export type SocialSegment = "friends" | "requests" | "chats" | "sessions";
export type RequestView = "incoming" | "sent";
export type ChatView = "active" | "archived";
export type ListRelation = "friends" | "sent" | "received" | "none";

export type SocialRowsInput = {
  isSearching: boolean;
  results: ProfileSearchHit[];
  platformFilter: string | null;
  countryFilter: string | null;
  segment: SocialSegment;
  query: string;
  friendships: Friendship[];
  friendProfiles: Record<string, { displayName?: string; handle?: string } | undefined>;
  uid: string;
  requestView: RequestView;
  sentRequests: FriendRequest[];
  requests: FriendRequest[];
  visibleConversations: Conversation[];
};

const SEARCH_PLATFORMS = ["PC", "PlayStation", "Xbox"] as const;

export function searchPlatforms(): readonly string[] {
  return SEARCH_PLATFORMS;
}

/**
 * Hidden conversations stay out of both chat views unless a newer message
 * arrives after `deletedAt`. Archived view is archived-only; active view is
 * the rest.
 */
export function visibleConversations(
  conversations: Conversation[],
  conversationSettings: Record<string, ConversationUserState | undefined>,
  chatView: ChatView,
): Conversation[] {
  return conversations.filter((conversation) => {
    const state = conversationSettings[conversation.id];
    const deleted = state?.deletedAt != null;
    const archived = state?.archived === true;
    const resurfaced =
      deleted &&
      state?.deletedAt != null &&
      conversation.lastMessageAt != null &&
      conversation.lastMessageAt > (state.deletedAt as number);
    if (deleted && !resurfaced) return false;
    if (chatView === "archived") return archived;
    return !archived;
  });
}

export function selectSocialRows(
  input: SocialRowsInput,
): ProfileSearchHit[] | Friendship[] | FriendRequest[] | Conversation[] {
  if (input.isSearching) {
    return input.results.filter((item) => {
      const platformOk =
        !input.platformFilter ||
        item.platform.toLowerCase() === input.platformFilter.toLowerCase();
      const countryOk =
        !input.countryFilter ||
        item.country.toLowerCase() === input.countryFilter.toLowerCase();
      return platformOk && countryOk;
    });
  }

  if (input.segment === "friends") {
    const term = input.query.trim().toLowerCase();
    if (!term) return input.friendships;
    return input.friendships.filter((friendship) => {
      const other = friendship.members.find((member) => member !== input.uid);
      const profile = other ? input.friendProfiles[other] : undefined;
      return (
        (profile?.displayName ?? "").toLowerCase().includes(term) ||
        (profile?.handle ?? "").toLowerCase().includes(term)
      );
    });
  }

  if (input.segment === "requests") {
    return input.requestView === "sent" ? input.sentRequests : input.requests;
  }

  if (input.segment === "chats") return input.visibleConversations;

  // Sessions still fall through to friendships. The screen swaps in session
  // cards only when this segment is selected and search is inactive.
  return input.friendships;
}

export function socialTabCounts(input: {
  friendships: Friendship[];
  requests: FriendRequest[];
  unreadCounts: Record<string, number>;
  sessionsLength: number;
}): Record<SocialSegment, number> {
  return {
    friends: input.friendships.length,
    requests: input.requests.length,
    chats: Object.keys(input.unreadCounts).length,
    sessions: input.sessionsLength,
  };
}

export function toGroupFriends(
  friendships: Friendship[],
  friendProfiles: Record<string, { displayName?: string; photoURL?: string | null } | undefined>,
  uid: string,
): GroupFriend[] {
  return friendships.flatMap((friendship) => {
    const friendUid = friendship.members.find((member) => member !== uid);
    if (!friendUid) return [];
    const profile = friendProfiles[friendUid];
    return [
      {
        uid: friendUid,
        displayName: profile?.displayName ?? "Player",
        photoURL: profile?.photoURL ?? null,
      },
    ];
  });
}

/**
 * Last write wins, in this order: friendship, then incoming, then sent.
 * A uid present in more than one list therefore resolves to the latest write,
 * which is the same result as the original sequential `Map#set` calls.
 */
export function relationByUid(
  friendships: Friendship[],
  requests: FriendRequest[],
  sentRequests: FriendRequest[],
  uid: string,
): Map<string, ListRelation> {
  const map = new Map<string, ListRelation>();
  friendships.forEach((friendship) => {
    const other = friendship.members.find((member) => member !== uid);
    if (other) map.set(other, "friends");
  });
  requests.forEach((request) => {
    map.set(request.from, "received");
  });
  sentRequests.forEach((request) => {
    map.set(request.to, "sent");
  });
  return map;
}

/** First-seen country order from search hits. Empty countries are dropped. */
export function countryOptions(results: ProfileSearchHit[]): string[] {
  return Array.from(new Set(results.map((item) => item.country).filter(Boolean)));
}
