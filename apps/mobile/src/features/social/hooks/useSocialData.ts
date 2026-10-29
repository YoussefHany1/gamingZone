import { useCallback, useEffect, useState } from "react";
import type { FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import { useAuthStore } from "@/src/store/useAuthStore";
import {
  listenToFriendships,
  listenToIncomingRequests,
  searchProfiles,
} from "../lib/friendService";

export function useSocialData() {
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [results, setResults] = useState<ProfileSearchHit[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!uid) return;
    const stopFriends = listenToFriendships(uid, setFriendships, setError);
    const stopRequests = listenToIncomingRequests(uid, setRequests, setError);
    return () => {
      stopFriends();
      stopRequests();
    };
  }, [uid]);

  const search = useCallback(async (query: string) => {
    try {
      const next = await searchProfiles(query);
      setResults(next);
      setError(null);
      return next;
    } catch (reason) {
      setError(reason);
      return [];
    }
  }, []);

  return { friendships, requests, results, search, error };
}
