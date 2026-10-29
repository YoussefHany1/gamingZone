import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { logger } from "@/src/lib/logger";

export type PlaySession = {
  id: string;
  conversationId: string;
  participantUids: string[];
  gameId: string | number;
  gameName: string;
  proposals: Array<{
    id: string;
    proposerUid: string;
    startsAt: number;
    durationMin: number;
    responses: Record<string, string>;
    status?: string;
  }>;
  confirmedProposalId: string | null;
  startsAt: number | null;
  createdBy?: string;
  status: "proposed" | "confirmed" | "cancelled" | "completed";
};

export function usePlaySessions(uid: string) {
  const [sessions, setSessions] = useState<PlaySession[]>([]);

  useEffect(() => {
    if (!uid) return;
    return firestore()
      .collection("playSessions")
      .where("participantUids", "array-contains", uid)
      .onSnapshot(
        (snapshot) =>
          setSessions(
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<PlaySession, "id">),
            })),
          ),
        (error) => logger.warn("[social] Sessions listener failed", error),
      );
  }, [uid]);

  return sessions;
}
