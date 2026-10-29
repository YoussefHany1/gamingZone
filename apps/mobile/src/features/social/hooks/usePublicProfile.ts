import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import type { PublicProfile } from "@gaming-zone/core";
import { normalizeHandle } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import { mapPublicProfile } from "../lib/profileMapper";

export type PublicProfileError = "not_found" | "blocked" | "unknown" | null;

export type UsePublicProfileParams = {
  /** Prefer the uid when known — it is a direct document read. */
  uid?: string;
  /** Otherwise resolve the profile from its handle (search results, /u links). */
  handle?: string;
};

export type UsePublicProfileResult = {
  profile: PublicProfile | null;
  loading: boolean;
  error: PublicProfileError;
};

function isBlockedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "permission-denied"
  );
}

/**
 * One public profile, read live.
 *
 * A `permission-denied` snapshot is how the rules enforce symmetric blocking:
 * the reader is signed in but a `blockedPairs` entry exists, so Firestore
 * refuses the read. That is a product state ("blocked"), not a crash.
 *
 * A `handle` is resolved through `usernames/{handle}` first because `profiles`
 * has no client `list` rule — a query cannot enforce blocking, so allowing one
 * would leak a blocked profile. Search-by-handle is a backend endpoint.
 */
export function usePublicProfile({
  uid,
  handle,
}: UsePublicProfileParams): UsePublicProfileResult {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PublicProfileError>(null);

  useEffect(() => {
    const normalizedHandle = handle ? normalizeHandle(handle) : "";

    if (!uid && !normalizedHandle) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const onError = (snapshotError: unknown): void => {
      logger.error("[usePublicProfile] listener failed:", snapshotError);
      setProfile(null);
      setError(isBlockedError(snapshotError) ? "blocked" : "unknown");
      setLoading(false);
    };

    if (uid) {
      return firestore()
        .collection("profiles")
        .doc(uid)
        .onSnapshot(
          (snapshot) => {
            const mapped = mapPublicProfile(
              uid,
              snapshot.exists() ? snapshot.data() : undefined,
            );
            setProfile(mapped);
            setError(mapped ? null : "not_found");
            setLoading(false);
          },
          onError,
        );
    }

    // Resolve the handle to a uid first. `profiles` has no client `list` rule —
    // a query cannot enforce symmetric blocking — so a handle lookup is a read
    // of the public reservation followed by the blocked-aware profile read.
    // (`usernames/{handle}` is the same reservation the claim transaction
    // writes, so it always points at the current owner.)
    let stopProfile = (): void => {};
    let listeningUid = "";

    const stopHandle = firestore()
      .collection("usernames")
      .doc(normalizedHandle)
      .onSnapshot(
        (snapshot) => {
          const resolvedUid = (snapshot.data() as { uid?: unknown } | undefined)?.uid;

          if (typeof resolvedUid !== "string" || !resolvedUid) {
            stopProfile();
            stopProfile = () => {};
            listeningUid = "";
            setProfile(null);
            setError("not_found");
            setLoading(false);
            return;
          }

          if (resolvedUid === listeningUid) return;
          listeningUid = resolvedUid;

          stopProfile();
          stopProfile = firestore()
            .collection("profiles")
            .doc(resolvedUid)
            .onSnapshot(
              (profileSnapshot) => {
                const mapped = mapPublicProfile(
                  resolvedUid,
                  profileSnapshot.exists() ? profileSnapshot.data() : undefined,
                );
                setProfile(mapped);
                setError(mapped ? null : "not_found");
                setLoading(false);
              },
              onError,
            );
        },
        onError,
      );

    return () => {
      stopHandle();
      stopProfile();
    };
  }, [uid, handle]);

  return { profile, loading, error };
}
