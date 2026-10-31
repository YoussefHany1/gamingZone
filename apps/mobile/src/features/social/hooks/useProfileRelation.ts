import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { blockedPairId, friendRequestId, friendshipId } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";
import { deriveRelation, emptyRelationState, type RelationState } from "../lib/relation";

export function useProfileRelation(currentUid: string, otherUid: string) {
  const [relationState, setRelationState] = useState<RelationState>(emptyRelationState);

  useEffect(() => {
    if (!currentUid || !otherUid || currentUid === otherUid) {
      setRelationState(emptyRelationState);
      return;
    }

    const onListenerError = (err: unknown) => {
      logger.warn("[social] Relation listener failed", err);
    };

    const stops = [
      firestore()
        .collection("friendships")
        .doc(friendshipId(currentUid, otherUid))
        .onSnapshot(
          (snap) => setRelationState((prev) => ({ ...prev, friendshipActive: snap?.data()?.status === "active" })),
          onListenerError,
        ),
      firestore()
        .collection("friendRequests")
        .doc(friendRequestId(currentUid, otherUid))
        .onSnapshot(
          (snap) => setRelationState((prev) => ({ ...prev, requestSent: snap?.data()?.status === "pending" })),
          onListenerError,
        ),
      firestore()
        .collection("friendRequests")
        .doc(friendRequestId(otherUid, currentUid))
        .onSnapshot(
          (snap) => setRelationState((prev) => ({ ...prev, requestReceived: snap?.data()?.status === "pending" })),
          onListenerError,
        ),
      firestore()
        .collection("blockedPairs")
        .doc(blockedPairId(currentUid, otherUid))
        .onSnapshot(
          (snap) => setRelationState((prev) => ({ ...prev, blocked: Boolean(snap?.exists()) })),
          onListenerError,
        ),
    ];

    return () => stops.forEach((stop) => stop());
  }, [currentUid, otherUid]);

  return deriveRelation(relationState);
}
