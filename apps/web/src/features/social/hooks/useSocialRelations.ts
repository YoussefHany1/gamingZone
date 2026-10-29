import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import type {
  FriendRequest,
  Friendship,
  ProfileSearchHit,
} from "@gaming-zone/core";
import { db } from "@/lib/firebase";

function profileFrom(
  uid: string,
  data: DocumentData | undefined,
): ProfileSearchHit {
  return {
    uid,
    handle: typeof data?.handle === "string" ? data.handle : "",
    displayName:
      typeof data?.displayName === "string" ? data.displayName : "Player",
    photoURL: typeof data?.photoURL === "string" ? data.photoURL : null,
    platform: typeof data?.platform === "string" ? data.platform : "",
    country: typeof data?.country === "string" ? data.country : "",
  };
}

export function useSocialRelations(uid: string) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<ProfileSearchHit[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    const friendsQuery = query(
      collection(db, "friendships"),
      where("members", "array-contains", uid),
      where("status", "==", "active"),
    );
    const requestsQuery = query(
      collection(db, "friendRequests"),
      where("to", "==", uid),
      where("status", "==", "pending"),
    );

    const stopFriends = onSnapshot(
      friendsQuery,
      async (snapshot) => {
        const next = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Friendship, "id">),
        }));
        setFriendships(next);
        try {
          const profiles = await Promise.all(
            next.map(async (friendship) => {
              const otherUid = friendship.members.find(
                (member) => member !== uid,
              );
              if (!otherUid) return null;
              const profile = await getDoc(doc(db, "profiles", otherUid));
              return profile.exists()
                ? profileFrom(otherUid, profile.data())
                : null;
            }),
          );
          setFriends(
            profiles.filter(
              (profile): profile is ProfileSearchHit => profile !== null,
            ),
          );
        } catch {
          setError("load");
        }
      },
      () => setError("load"),
    );
    const stopRequests = onSnapshot(
      requestsQuery,
      (snapshot) =>
        setRequests(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<FriendRequest, "id">),
          })),
        ),
      () => setError("load"),
    );
    return () => {
      stopFriends();
      stopRequests();
    };
  }, [uid]);

  return { friendships, requests, friends, error };
}
