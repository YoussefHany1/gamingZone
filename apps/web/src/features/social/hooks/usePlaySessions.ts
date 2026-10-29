import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type WebPlaySession = {
  id: string;
  conversationId: string;
  participantUids: string[];
  gameName: string;
  status: string;
  proposals: Array<{ id: string; proposerUid: string; startsAt: number; responses: Record<string, string>; status?: string }>;
};

export function usePlaySessions(uid: string) {
  const [sessions, setSessions] = useState<WebPlaySession[]>([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "playSessions"), where("participantUids", "array-contains", uid)),
      (snapshot) => setSessions(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as DocumentData) } as WebPlaySession))),
      () => undefined,
    );
  }, [uid]);
  return sessions;
}
