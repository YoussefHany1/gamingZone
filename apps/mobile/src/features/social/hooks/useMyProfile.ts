import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import type { PublicProfile } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import { mapPublicProfile } from "../lib/profileMapper";

export type UseMyProfileResult = {
  profile: PublicProfile | null;
  /** True until the first snapshot arrives (or immediately when `uid` is empty). */
  loading: boolean;
};

/**
 * Live view of the signed-in user's own public profile.
 *
 * Returns `profile === null` both when the document is still missing (the
 * bootstrap request has not completed yet) and when it has no handle.
 */
export function useMyProfile(uid: string): UseMyProfileResult {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(uid !== "");

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = firestore()
      .collection("profiles")
      .doc(uid)
      .onSnapshot(
        (snapshot) => {
          setProfile(mapPublicProfile(uid, snapshot.exists() ? snapshot.data() : undefined));
          setLoading(false);
        },
        (error) => {
          logger.error("[useMyProfile] profile listener failed:", error);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, [uid]);

  return { profile, loading };
}
