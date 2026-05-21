"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useLangStore } from "../store/useLangStore";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  X,
  Check,
  Square,
  Plus,
  Loader2,
  List,
} from "lucide-react";

interface UserList {
  id: string;
  name: string;
  isChecked: boolean;
}

interface ListSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  gameId?: string | number;
  gameData?: Record<string, unknown>;
}

export default function ListSelectionModal({
  visible,
  onClose,
  gameId,
  gameData,
}: ListSelectionModalProps) {
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingLoading, setCreatingLoading] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { t } = useLangStore();

  const getDisplayName = useCallback(
    (originalName: string): string => {
      switch (originalName) {
        case "Playing":
          return t("games.details.listStatus.playing");
        case "Played":
          return t("games.details.listStatus.played");
        case "Want to Play":
          return t("games.details.listStatus.wantToPlay");
        default:
          return originalName;
      }
    },
    [t]
  );

  useEffect(() => {
    if (!visible) {
      setIsCreating(false);
      setNewListName("");
      return;
    }

    if (!user) return;

    setLists([]);
    setLoading(true);

    const listsRef = collection(db, "users", user.uid, "lists");

    getDocs(listsRef).then(async (snapshot) => {
      const initialLists: UserList[] = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
        isChecked: false,
      }));

      setLists(initialLists);
      setLoading(false);

      if (!gameId) return;

      try {
        const checkedLists = await Promise.all(
          initialLists.map(async (list) => {
            const gameDoc = await getDoc(
              doc(db, "users", user.uid, "lists", list.id, "games", String(gameId))
            );
            return { ...list, isChecked: gameDoc.exists() };
          })
        );
        setLists(checkedLists);
      } catch (error) {
        console.error("Error checking games:", error);
      }
    });
  }, [visible, gameId, user]);

  const toggleList = useCallback(
    async (listId: string) => {
      if (!user) return;

      const targetIdx = lists.findIndex((l) => l.id === listId);
      if (targetIdx === -1) return;

      const currentStatus = lists[targetIdx].isChecked;
      const newStatus = !currentStatus;

      // Optimistic update
      const updated = [...lists];
      updated[targetIdx] = { ...updated[targetIdx], isChecked: newStatus };
      setLists(updated);

      const gameRef = doc(
        db,
        "users",
        user.uid,
        "lists",
        listId,
        "games",
        String(gameId)
      );

      try {
        if (newStatus) {
          if (gameData) await setDoc(gameRef, gameData);
        } else {
          await deleteDoc(gameRef);
        }
      } catch (error) {
        console.error("Error toggling list:", error);
        // Revert on failure
        const reverted = [...lists];
        reverted[targetIdx] = { ...reverted[targetIdx], isChecked: currentStatus };
        setLists(reverted);
      }
    },
    [lists, gameId, gameData, user]
  );

  const handleCreateList = useCallback(async () => {
    const trimmed = newListName.trim();
    if (!trimmed || !user) return;

    const exists = lists.some(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return;

    setCreatingLoading(true);
    try {
      const newListRef = doc(collection(db, "users", user.uid, "lists"));
      await setDoc(newListRef, {
        name: trimmed,
        type: "custom",
        createdAt: serverTimestamp(),
      });

      setLists((prev) => [
        ...prev,
        { id: newListRef.id, name: trimmed, isChecked: false },
      ]);
      setNewListName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating list:", error);
    } finally {
      setCreatingLoading(false);
    }
  }, [lists, newListName, user]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <List className="w-5 h-5 text-light-blue" />
            {t("games.details.listStatus.add")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-light-blue animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              {t("userLists.empty.title")}
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {lists.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleList(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/5 ${
                    item.isChecked ? "bg-secondary-blue/10" : ""
                  }`}
                >
                  {item.isChecked ? (
                    <div className="w-5 h-5 rounded bg-light-blue flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                  ) : (
                    <Square className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      item.isChecked ? "font-bold text-white" : "text-gray-300"
                    }`}
                  >
                    {getDisplayName(item.name)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create new list section */}
        <div className="border-t border-white/10 p-4">
          {isCreating ? (
            <div className="space-y-3">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={t("userLists.placeholders.newListName")}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreateList}
                  disabled={creatingLoading || !newListName.trim()}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {creatingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("common.create")
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/20 text-sm font-semibold text-light-blue hover:bg-white/5 hover:border-light-blue/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              {t("userLists.actions.createNewList")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
