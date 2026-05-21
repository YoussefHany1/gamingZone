"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { useLangStore } from "../../store/useLangStore";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  List,
  FolderOpen,
  Plus,
  Trash2,
  Loader2,
  Bookmark,
  X,
  Gamepad2,
} from "lucide-react";

interface GameList {
  id: string;
  name: string;
  type: "default" | "custom";
}

const DEFAULT_LISTS = [
  { id: "played", name: "Played", type: "default" as const },
  { id: "wantToPlay", name: "Want to Play", type: "default" as const },
  { id: "playing", name: "Playing", type: "default" as const },
];

export default function ListsPage() {
  const router = useRouter();
  const { t } = useLangStore();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Redirect anonymous/unauthenticated users
  useEffect(() => {
    if (!isLoading && (!user || user.isAnonymous)) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // i18n list name
  const getDisplayName = useCallback(
    (name: string): string => {
      const map: Record<string, string> = {
        Playing: t("games.details.listStatus.playing"),
        Played: t("games.details.listStatus.played"),
        "Want to Play": t("games.details.listStatus.wantToPlay"),
      };
      return map[name] ?? name;
    },
    [t]
  );

  // Firestore init + listener
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const listsRef = collection(db, "users", user.uid, "lists");

    // Init default lists if empty
    const initDefaults = async () => {
      const { getDocs } = await import("firebase/firestore");
      const snap = await getDocs(listsRef);
      if (!snap.empty) return;

      const batch = writeBatch(db);
      DEFAULT_LISTS.forEach(({ id, name, type }) => {
        batch.set(doc(listsRef, id), {
          name,
          type,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
    };

    initDefaults();

    const q = query(listsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setLists(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<GameList, "id">),
        }))
      );
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Create list
  const handleCreateList = useCallback(async () => {
    const trimmed = newListName.trim();
    if (!trimmed || !user) return;

    const exists = lists.some(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return;

    setIsCreating(true);
    try {
      const newRef = doc(collection(db, "users", user.uid, "lists"));
      await setDoc(newRef, {
        name: trimmed,
        type: "custom",
        createdAt: serverTimestamp(),
      });
      setNewListName("");
      setModalOpen(false);
    } catch (error) {
      console.error("Create list error:", error);
    } finally {
      setIsCreating(false);
    }
  }, [newListName, lists, user]);

  // Delete list
  const handleDeleteList = useCallback(
    async (listId: string) => {
      if (!user) return;
      try {
        await deleteDoc(doc(db, "users", user.uid, "lists", listId));
      } catch (error) {
        console.error("Delete list error:", error);
      }
      setDeleteConfirm(null);
    },
    [user]
  );

  if (isLoading || !user || user.isAnonymous) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-light-blue animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-10 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bookmark className="w-8 h-8 text-light-blue" />
              {t("navigation.titles.myLists")}
            </h1>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-semibold text-sm shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              {t("userLists.actions.createNewList")}
            </button>
          </div>

          {/* Lists */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-light-blue animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <Bookmark className="w-20 h-20 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-400">
                {t("userLists.empty.title")}
              </h2>
              <p className="text-gray-500 text-sm">
                {t("userLists.empty.playedSub")}
              </p>
              <Link
                href="/games"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-semibold shadow-lg hover:opacity-90 transition-all"
              >
                {t("userLists.empty.findButton")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {lists.map((list) => (
                <div key={list.id} className="relative group">
                  <Link
                    href={`/lists/${list.id}?name=${encodeURIComponent(list.name)}`}
                    className="flex items-center justify-between p-5 rounded-2xl glass-panel border border-white/10 hover:border-light-blue/20 hover:bg-white/[0.03] transition-all duration-300 group-hover:shadow-lg group-hover:shadow-light-blue/5"
                  >
                    <div className="flex items-center gap-4">
                      {list.type === "default" ? (
                        <div className="w-10 h-10 rounded-xl bg-light-blue/10 border border-light-blue/20 flex items-center justify-center">
                          <List className="w-5 h-5 text-light-blue" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-secondary-blue/10 border border-secondary-blue/20 flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-secondary-blue" />
                        </div>
                      )}
                      <span className="text-base font-semibold">
                        {getDisplayName(list.name)}
                      </span>
                    </div>
                    <Gamepad2 className="w-5 h-5 text-gray-600 group-hover:text-light-blue transition-colors" />
                  </Link>

                  {/* Delete button for custom lists */}
                  {list.type === "custom" && (
                    <>
                      {deleteConfirm === list.id ? (
                        <div className="absolute right-16 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-in fade-in slide-in-from-right duration-200">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            onClick={() => handleDeleteList(list.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors"
                          >
                            {t("common.remove")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteConfirm(list.id);
                          }}
                          className="absolute right-16 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create List Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="glass-panel border border-white/10 rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {t("userLists.actions.createNewList")}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t("userLists.placeholders.newListName")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 font-semibold text-gray-300 hover:bg-white/10 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCreateList}
                disabled={isCreating || !newListName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("common.create")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
