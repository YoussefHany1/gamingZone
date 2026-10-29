import { useCallback, useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import type {
  Conversation,
  FriendRequest,
  Friendship,
  ProfileSearchHit,
} from "@gaming-zone/core";
import { useAuthStore } from "@/src/store/useAuthStore";
import { logger } from "@/src/lib/logger";
import {
  listenToFriendships,
  listenToIncomingRequests,
  searchProfiles,
} from "../lib/friendService";
import { listenToConversations } from "../lib/chatService";

export function useSocialData() {
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [results, setResults] = useState<ProfileSearchHit[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, ProfileSearchHit>>(
    {},
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchError, setSearchError] = useState<unknown>(null);

  useEffect(() => {
    if (!uid) return;

    const stopFriends = listenToFriendships(
      uid,
      (next) => setFriendships(next),
      (err) => logger.error("[social] Friends listener failed", err),
    );
    const stopRequests = listenToIncomingRequests(
      uid,
      (next) => setRequests(next),
      (err) => logger.error("[social] Requests listener failed", err),
    );
    const stopConversations = listenToConversations(
      uid,
      (next) => setConversations(next),
      (err) => logger.warn("[social] Conversations unavailable", err),
    );
    return () => {
      stopFriends();
      stopRequests();
      stopConversations();
    };
  }, [uid]);

  // Profile cache covering friendships, requests, and DM counterparts.
  useEffect(() => {
    if (!uid) return;

    const profileUids = new Set<string>();

    // Friendship members (excluding self)
    friendships.forEach((f) =>
      f.members.forEach((member) => {
        if (member !== uid) profileUids.add(member);
      }),
    );

    // Request senders
    requests.forEach((r) => profileUids.add(r.from));

    // DM counterparts (skip groups and self)
    conversations.forEach((c) => {
      if (c.type === "dm") {
        c.members.forEach((member) => {
          if (member !== uid) profileUids.add(member);
        });
      }
    });

    if (profileUids.size === 0) {
      setFriendProfiles({});
      return;
    }

    void Promise.all(
      Array.from(profileUids).map(async (targetUid) => {
        try {
          const snapshot = await firestore().collection("profiles").doc(targetUid).get();
          if (!snapshot.exists()) return null;
          const data = snapshot.data() ?? {};
          return [
            targetUid,
            {
              uid: targetUid,
              handle: typeof data.handle === "string" ? data.handle : "",
              displayName:
                typeof data.displayName === "string" ? data.displayName : "Player",
              photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
              platform: typeof data.platform === "string" ? data.platform : "",
              country: typeof data.country === "string" ? data.country : "",
            } satisfies ProfileSearchHit,
          ] as const;
        } catch (error) {
          logger.warn(`[social] Failed to load profile ${targetUid}`, error);
          return null;
        }
      }),
    )
      .then((entries) =>
        setFriendProfiles(
          Object.fromEntries(
            entries.filter(Boolean) as Array<readonly [string, ProfileSearchHit]>,
          ),
        ),
      )
      .catch(() => undefined);
  }, [uid, friendships, requests, conversations]);

  const search = useCallback(async (query: string) => {
    try {
      const next = await searchProfiles(query);
      setResults(next);
      setSearchError(null);
      return next;
    } catch (reason) {
      logger.error("[social] Search failed", reason);
      setSearchError(reason);
      return [];
    }
  }, []);

  return {
    uid,
    friendships,
    friendProfiles,
    requests,
    conversations,
    results,
    search,
    searchError,
  };
}
