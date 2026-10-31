import { useCallback, useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { logger } from "@/src/lib/logger";

export interface BlockedUser {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string | null;
}

export function useBlockedUsers(uid: string) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBlockedUsers = useCallback(
    async (showRefresh = false) => {
      if (!uid) {
        setBlockedUsers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (showRefresh) setRefreshing(true);

      try {
        const snapshot = await firestore()
          .collection("blocks")
          .doc(uid)
          .collection("uids")
          .get();

        const users: BlockedUser[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            handle: typeof data.handle === "string" ? data.handle : "",
            displayName:
              typeof data.displayName === "string" ? data.displayName : "Player",
            photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
          };
        });

        setBlockedUsers(users);
      } catch (error) {
        logger.error("[BlockedUsers] Failed to load blocked users", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid],
  );

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  return { blockedUsers, loading, refreshing, loadBlockedUsers };
}
