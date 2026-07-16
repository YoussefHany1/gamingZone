import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { GameList, DEFAULT_LISTS } from "../types";

export function useLists() {
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

  // Auth redirect handled by middleware

  // i18n list name
  const getDisplayName = useCallback(
    (name: string): string => {
      const map: Record<string, string> = {
        Playing: t("games.details.listStatus.playing"),
        Played: t("games.details.listStatus.played"),
        "Want to Play": t("games.details.listStatus.wantToPlay"),
        Rated: t("games.details.listStatus.rated") ?? "Rated",
      };
      return map[name] ?? name;
    },
    [t],
  );

  // Firestore init + listener
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const listsRef = collection(db, "users", user.uid, "lists");

    // Init default lists if empty
    const initDefaults = async () => {
      try {
        const { getDocs, getDoc, doc: fdoc, deleteDoc } = await import("firebase/firestore");
        const snap = await getDocs(listsRef);

        const docRatedRef = fdoc(listsRef, "rated");
        const docRated = await getDoc(docRatedRef);
        if (!docRated.exists()) {
          await setDoc(docRatedRef, {
            name: "Rated",
            type: "default",
            createdAt: serverTimestamp(),
          });
        }

        if (snap.empty) {
          const batch = writeBatch(db);
          DEFAULT_LISTS.forEach(({ id, name, type }) => {
            if (id === "rated") return;
            batch.set(doc(listsRef, id), {
              name,
              type,
              createdAt: serverTimestamp(),
            });
          });
          await batch.commit();
        } else {
          const allowedDefaultIds = [
            "played",
            "wantToPlay",
            "playing",
            "rated",
          ];
          for (const d of snap.docs) {
            const data = d.data();
            if (data.type === "default" && !allowedDefaultIds.includes(d.id)) {
              await deleteDoc(d.ref);
            }
          }
        }
      } catch (error) {
        console.error("[useLists] initDefaults error:", error);
      }
    };

    initDefaults();

    const unsub = onSnapshot(
      listsRef,
      (snap) => {
        const parsed = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<GameList, "id">),
        }));
        const DEFAULT_ORDER = ["played", "wantToPlay", "playing", "rated"];
        parsed.sort((a, b) => {
          const aIdx = DEFAULT_ORDER.indexOf(a.id);
          const bIdx = DEFAULT_ORDER.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return aTime - bTime || a.name.localeCompare(b.name);
        });
        setLists(parsed);
        setLoading(false);
      },
      (error) => {
        console.error("[useLists] onSnapshot error:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user]);

  // Create list
  const handleCreateList = useCallback(async () => {
    const trimmed = newListName.trim();
    if (!trimmed || !user) return;

    const exists = lists.some(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast.error(t("userLists.errors.alreadyExists") || "List already exists");
      return;
    }

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
      toast.success(t("userLists.success.created") || "List created successfully");
    } catch (error) {
      console.error("Create list error:", error);
      toast.error(t("common.error") || "An error occurred");
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
        toast.success(t("userLists.success.deleted") || "List deleted successfully");
      } catch (error) {
        console.error("Delete list error:", error);
        toast.error(t("common.error") || "An error occurred");
      }
      setDeleteConfirm(null);
    },
    [user],
  );

  return {
    t,
    user,
    isLoading,
    lists,
    loading,
    modalOpen,
    setModalOpen,
    newListName,
    setNewListName,
    isCreating,
    deleteConfirm,
    setDeleteConfirm,
    getDisplayName,
    handleCreateList,
    handleDeleteList,
  };
}
