import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";
import { relativeTime } from "../lib/relativeTime";
import { ONLINE_WINDOW_MS, isPresenceFresh } from "../lib/presence";

export type PeerPresence = {
  online: boolean;
  /** Epoch millis of the peer's last heartbeat, or null when unknown. */
  lastActiveAt: number | null;
  /** "Last seen <relative>" label, empty while the peer looks online. */
  lastSeenLabel: string;
};

/**
 * Header presence for a single peer (DM chats): one doc listener on the
 * dedicated `presence` collection (readable by any authed user), with a
 * timer flipping the "online" verdict once the shared window expires even
 * without another snapshot.
 */
export function usePeerPresence(peerUid: string | null): PeerPresence {
  const { i18n } = useTranslation();
  const [lastActiveAt, setLastActiveAt] = useState<number | null>(null);
  const [, setPresenceClock] = useState(0);

  useEffect(() => {
    if (!peerUid) {
      setLastActiveAt(null);
      return;
    }
    return firestore()
      .collection("presence")
      .doc(peerUid)
      .onSnapshot(
        (snapshot) => {
          const updatedAt = snapshot.data()?.updatedAt;
          setLastActiveAt(typeof updatedAt === "number" ? updatedAt : null);
        },
        (error) => {
          logger.warn("[social] Failed to load peer presence", error);
          setLastActiveAt(null);
        },
      );
  }, [peerUid]);

  useEffect(() => {
    if (lastActiveAt === null) return;
    const delay = lastActiveAt + ONLINE_WINDOW_MS - Date.now();
    if (delay <= 0) {
      setPresenceClock((tick) => tick + 1);
      return;
    }
    const timer = setTimeout(() => setPresenceClock((tick) => tick + 1), delay);
    return () => clearTimeout(timer);
  }, [lastActiveAt]);

  const online = peerUid !== null && isPresenceFresh(lastActiveAt);
  const lastSeenLabel =
    peerUid !== null && lastActiveAt !== null && !online
      ? relativeTime(lastActiveAt, i18n.language)
      : "";

  return { online, lastActiveAt, lastSeenLabel };
}
