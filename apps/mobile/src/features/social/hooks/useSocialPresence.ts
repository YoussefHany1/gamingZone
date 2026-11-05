import { useEffect, useMemo, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { logger } from "@/src/lib/logger";

export type PresenceEntry = {
  online: boolean;
  /** Client-epoch millis of the peer's last heartbeat, or null when unknown. */
  lastActiveAt: number | null;
};

/** A user counts as online for this long after their last heartbeat. */
const ONLINE_WINDOW_MS = 5 * 60_000;

/** How often the online computation refreshes while the hook is mounted. */
const REFRESH_INTERVAL_MS = 2 * 60_000;

/**
 * Firestore `in` queries accept at most 30 values per `documentId()` chunk;
 * hard-cap at 3 chunks (90 friends) so the social list stays a bounded read.
 */
const MAX_IDS_PER_CHUNK = 30;
const MAX_CHUNKS = 3;

const OFFLINE: PresenceEntry = { online: false, lastActiveAt: null };

/**
 * Client-computed presence for a set of uids.
 *
 * Writers only need `presence/{uid}.updatedAt` (a plain JS epoch-millis
 * number, maintained by `usePresenceHeartbeat`) — the dedicated collection is
 * readable by any authed user (firestore.rules) with no backend involvement.
 * The read is a chunked `documentId in` equality query (Firestore rejects
 * combining that with a range filter on another field); "online" is computed
 * client-side against the 5-minute window, so uids without a fresh heartbeat
 * resolve to offline.
 */
export function useSocialPresence(friendUids: string[]): Record<string, PresenceEntry> {
  // Stable identity for the effect: same ids in any order → same subscription.
  const key = useMemo(
    () => Array.from(new Set(friendUids.filter(Boolean))).sort().join("|"),
    [friendUids],
  );
  const [presence, setPresence] = useState<Record<string, PresenceEntry>>({});

  useEffect(() => {
    const ids = key ? key.split("|") : [];
    if (ids.length === 0) {
      setPresence({});
      return;
    }

    let cancelled = false;

    // One full refresh: query online docs, rebuild the whole map. Every uid
    // requested but not returned defaults to offline.
    const fetchPresence = async (): Promise<void> => {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length && chunks.length < MAX_CHUNKS; i += MAX_IDS_PER_CHUNK) {
        chunks.push(ids.slice(i, i + MAX_IDS_PER_CHUNK));
      }
      if (chunks.length === 0) return;

      const cutoff = Date.now() - ONLINE_WINDOW_MS;
      try {
        // NOTE: no server-side range filter on `updatedAt` here — Firestore
        // turns a `documentId() in` into a range filter, and pairing that with
        // an inequality on another field is rejected outright (invalid
        // argument). Ids missing from the result are offline by construction,
        // so the cutoff only costs reads of tiny one-field docs.
        const snapshots = await Promise.all(
          chunks.map((chunk) =>
            firestore()
              .collection("presence")
              .where(firestore.FieldPath.documentId(), "in", chunk)
              .get(),
          ),
        );
        if (cancelled) return;

        const next: Record<string, PresenceEntry> = {};
        for (const id of ids) next[id] = OFFLINE;
        for (const snapshot of snapshots) {
          snapshot.forEach((doc) => {
            const updatedAt = doc.data().updatedAt;
            next[doc.id] =
              typeof updatedAt === "number" && updatedAt > cutoff
                ? { online: true, lastActiveAt: updatedAt }
                : OFFLINE;
          });
        }
        setPresence(next);
      } catch (error) {
        logger.warn("[social] Presence query failed", error);
        // Keep the previous snapshot — presence degrades gracefully.
      }
    };

    void fetchPresence();
    const timer = setInterval(() => void fetchPresence(), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `ids` is derived from `key`; keying the effect on the string keeps the
    // subscription stable across parent re-renders.
  }, [key]);

  return presence;
}
