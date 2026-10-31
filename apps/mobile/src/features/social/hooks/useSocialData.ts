import { useEffect, useMemo, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import type { FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import { listenToFriendships, listenToIncomingRequests } from "../lib/friendService";
import { mapProfileSearchHit } from "../lib/profileLookup";
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
  const [friendProfiles, setFriendProfiles] = useState<Record<string, ProfileSearchHit>>(
    {},
  );
  const { conversations, readAt } = useConversationList(uid);

  useEffect(() => {
    if (!uid) {
      setFriendships([]);
      setRequests([]);
      return;
    }

    const stopFriends = listenToFriendships(uid, setFriendships, (error) =>
      logger.error("[social] Friends listener failed", error),
    );
    const stopRequests = listenToIncomingRequests(uid, setRequests, (error) =>
      logger.error("[social] Requests listener failed", error),
    );
    return () => {
      stopFriends();
      stopRequests();
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
    conversations.forEach((conversation) => {
      if (conversation.type !== "dm") return;
      conversation.members.forEach((member) => {
        if (member !== uid) uids.add(member);
      });
    });
    return Array.from(uids).sort().join(UID_SEPARATOR);
  }, [uid, friendships, requests, conversations]);

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
          return [targetUid, mapProfileSearchHit(targetUid, snapshot.data())] as const;
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
      const lastMessage = conversation.lastMessage;
      const lastMessageAt = conversation.lastMessageAt;
      const lastRead = readAt[conversation.id] ?? null;
      if (
        lastMessage &&
        lastMessage.senderId !== uid &&
        lastMessageAt !== null &&
        (lastRead === null || lastMessageAt > lastRead)
      ) {
        counts[conversation.id] = 1;
      }
    }
    return counts;
  }, [conversations, readAt, uid]);

  return {
    uid,
    friendships,
    friendProfiles,
    requests,
    conversations,
    unreadCounts,
  };
}
