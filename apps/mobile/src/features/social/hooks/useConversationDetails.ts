import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import type { ConversationType } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";

export type ConversationDetails = {
  type: ConversationType | null;
  members: string[];
  admins: string[];
  title: string | null;
  photoURL: string | null;
};

const EMPTY_DETAILS: ConversationDetails = {
  type: null,
  members: [],
  admins: [],
  title: null,
  photoURL: null,
};

/**
 * One-shot metadata read for a conversation.
 *
 * Messages arrive through the realtime listener in `useChatMessages`; the
 * conversation document itself (title, photo, members) only changes through
 * explicit actions, so a single read per conversation is enough.
 */
export function useConversationDetails(conversationId: string): ConversationDetails {
  const [details, setDetails] = useState<ConversationDetails>(EMPTY_DETAILS);

  useEffect(() => {
    let cancelled = false;
    setDetails(EMPTY_DETAILS);

    void firestore()
      .collection("conversations")
      .doc(conversationId)
      .get()
      .then((snapshot) => {
        if (cancelled || !snapshot.exists) return;
        const data = snapshot.data() ?? {};
        setDetails({
          type: data.type === "dm" || data.type === "group" ? data.type : null,
          members: Array.isArray(data.members) ? data.members : [],
          admins: Array.isArray(data.admins) ? data.admins : [],
          title: typeof data.title === "string" ? data.title : null,
          photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
        });
      })
      .catch((error) => {
        logger.warn(`[social] Failed to load conversation ${conversationId}`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  return details;
}
