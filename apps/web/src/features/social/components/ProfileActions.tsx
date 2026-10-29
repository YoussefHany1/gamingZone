"use client";

import { useEffect, useState } from "react";
import { Check, Shield, UserPlus, UserX, X } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  blockedPairId,
  friendRequestId,
  friendshipId,
} from "@gaming-zone/core";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";
import { db } from "@/lib/firebase";
import {
  cancelFriendRequest,
  respondFriendRequest,
  sendFriendRequest,
  setBlock,
} from "../lib/socialApi";

export function ProfileActions({ uid }: { uid: string }) {
  const currentUid = useAuthStore((state) => state.user?.uid ?? "");
  const user = useAuthStore((state) => state.user);
  const { t } = useLangStore();
  const [relation, setRelation] = useState<
    "friends" | "sent" | "received" | "blocked" | "none"
  >("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentUid || !uid || currentUid === uid) return;
    const stops = [
      onSnapshot(
        doc(db, "friendships", friendshipId(currentUid, uid)),
        (snap) => {
          if (snap.data()?.status === "active") setRelation("friends");
        },
      ),
      onSnapshot(
        doc(db, "friendRequests", friendRequestId(currentUid, uid)),
        (snap) => {
          if (snap.data()?.status === "pending") setRelation("sent");
        },
      ),
      onSnapshot(
        doc(db, "friendRequests", friendRequestId(uid, currentUid)),
        (snap) => {
          if (snap.data()?.status === "pending") setRelation("received");
        },
      ),
      onSnapshot(
        doc(db, "blockedPairs", blockedPairId(currentUid, uid)),
        (snap) => {
          if (snap.exists()) setRelation("blocked");
        },
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [currentUid, uid]);

  if (!user || user.isAnonymous || !currentUid || currentUid === uid)
    return null;
  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await operation();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {relation === "none" && (
        <button
          disabled={busy}
          onClick={() => void run(() => sendFriendRequest(uid))}
          className="inline-flex items-center gap-2 rounded-xl bg-secondary-blue px-4 py-2 text-sm font-semibold text-white"
        >
          <UserPlus className="w-4 h-4" />
          {t("social.actions.addFriend")}
        </button>
      )}
      {relation === "sent" && (
        <button
          disabled={busy}
          onClick={() => void run(() => cancelFriendRequest(uid))}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-gray-300"
        >
          <X className="w-4 h-4" />
          {t("social.requests.cancel")}
        </button>
      )}
      {relation === "received" && (
        <button
          disabled={busy}
          onClick={() => void run(() => respondFriendRequest(uid, "accept"))}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Check className="w-4 h-4" />
          {t("social.requests.accept")}
        </button>
      )}
      {relation === "friends" && (
        <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-gray-300">
          <Check className="w-4 h-4" />
          {t("social.friends.title")}
        </span>
      )}
      {relation !== "blocked" && (
        <button
          disabled={busy}
          onClick={() => void run(() => setBlock(uid, "block"))}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600/80 px-4 py-2 text-sm font-semibold text-white"
        >
          <Shield className="w-4 h-4" />
          {t("social.actions.block")}
        </button>
      )}
      {relation === "blocked" && (
        <button
          disabled={busy}
          onClick={() => void run(() => setBlock(uid, "unblock"))}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white"
        >
          <UserX className="w-4 h-4" />
          {t("social.actions.unblock")}
        </button>
      )}
    </div>
  );
}
