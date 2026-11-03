import { useEffect, useMemo, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import type { FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import { listenToFriendships, listenToIncomingRequests, listenToSentRequests } from "../lib/friendService";
import { mapFriendProfile } from "../lib/profileLookup";
import { useConversationList } from "./useConversationList";

const UID_SEPARATOR = "\n";

/**
 * Friendships, incoming requests, conversations and the derived unread badges.
 *
 * Orchestrates the realtime listeners only; conversation/read state lives in
 * `useConversationList` and search lives in `useProfileSearch`, so this hook
 * does not re-render the whole feature when the user types in the search box.
 */
export function useSocialData() {
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<
    Record<string, ProfileSearchHit & { statusText?: string }>
  >({});
  const { conversations, readAt, userState } = useConversationList(uid);

  useEffect(() => {
    if (!uid) {
      setFriendships([]);
      setRequests([]);
      setSentRequests([]);
      return;
    }

    const stopFriends = listenToFriendships(uid, setFriendships, (error) =>
      logger.error("[social] Friends listener failed", error),
    );
    const stopRequests = listenToIncomingRequests(uid, setRequests, (error) =>
      logger.error("[social] Requests listener failed", error),
    );
    const stopSentRequests = listenToSentRequests(uid, setSentRequests, (error) =>
      logger.error("[social] Sent requests listener failed", error),
    );
    return () => {
      stopFriends();
      stopRequests();
      stopSentRequests();
    };
  }, [uid]);

  // Every uid the list needs a profile for: friends, request senders and DM
  // counterparts. Sort + join so the fetch only runs when the *set* changes,
  // not on every message update.
  const profileKey = useMemo(() => {
    const uids = new Set<string>();
    friendships.forEach((friendship) =>
      friendship.members.forEach((member) => {
        if (member !== uid) uids.add(member);
      }),
    );
    requests.forEach((request) => uids.add(request.from));
    sentRequests.forEach((request) => uids.add(request.to));
    conversations.forEach((conversation) => {
      if (conversation.type !== "dm") return;
      conversation.members.forEach((member) => {
        if (member !== uid) uids.add(member);
      });
    });
    return Array.from(uids).sort().join(UID_SEPARATOR);
  }, [uid, friendships, requests, sentRequests, conversations]);

  useEffect(() => {
    if (!uid || !profileKey) {
      setFriendProfiles({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      profileKey.split(UID_SEPARATOR).map(async (targetUid) => {
        try {
          const snapshot = await firestore().collection("profiles").doc(targetUid).get();
          if (!snapshot.exists()) return null;
          return [targetUid, mapFriendProfile(targetUid, snapshot.data())] as const;
        } catch (error) {
          logger.warn(`[social] Failed to load profile ${targetUid}`, error);
          return null;
        }
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setFriendProfiles(
          Object.fromEntries(
            entries.filter(Boolean) as Array<readonly [string, ProfileSearchHit]>,
          ),
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [uid, profileKey]);

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const conversation of conversations) {
      const state = userState[conversation.id];
      if (state?.deletedAt || state?.archived || state?.muted) continue;
      const lastMessage = conversation.lastMessage;
      const lastMessageAt = conversation.lastMessageAt;
      const lastRead = readAt[conversation.id] ?? null;
      if (
        lastMessage &&
        lastMessage.senderId !== uid &&
        lastMessageAt !== null &&
        (lastRead === null || lastMessageAt > lastRead)
      ) {
        counts[conversation.id] = 1; // presence flag, not a message count
      }
    }
    return counts;
  }, [conversations, readAt, userState, uid]);

  return {
    uid,
    friendships,
    friendProfiles,
    requests,
    sentRequests,
    conversations,
    unreadCounts,
    conversationSettings: userState,
  };
}
