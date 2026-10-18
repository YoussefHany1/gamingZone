import { useCallback, useRef, useState } from "react";
import { ToastAndroid } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { logger } from "@/src/lib/logger";

type UseListEditingOptions = {
  listId: string;
  targetUserId: string | null;
  /** Owner of a custom list — required to save. */
  canEdit: boolean;
  /** Current title/description, used to seed the draft when editing starts. */
  displayTitle: string;
  displayDescription: string;
  /** Called with the saved values so the caller can optimistically update. */
  onSaved: (name: string, description: string) => void;
};

/**
 * In-place title/description editing for a custom list. Owns the draft state and
 * the Firestore `update()`, guarded by `canEdit` + the owner id.
 */
export function useListEditing({
  listId,
  targetUserId,
  canEdit,
  displayTitle,
  displayDescription,
  onSaved,
}: UseListEditingOptions): {
  isEditing: boolean;
  draftTitle: string;
  draftDescription: string;
  isSaving: boolean;
  setDraftTitle: (value: string) => void;
  setDraftDescription: (value: string) => void;
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
} {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const startEdit = useCallback((): void => {
    setDraftTitle(displayTitle);
    setDraftDescription(displayDescription);
    setIsEditing(true);
  }, [displayTitle, displayDescription]);

  const cancelEdit = useCallback((): void => {
    setIsEditing(false);
    setDraftTitle("");
    setDraftDescription("");
  }, []);

  const saveEdit = useCallback(async (): Promise<void> => {
    // Hard guard against double submits (state may be stale in the closure).
    if (savingRef.current || !canEdit || !targetUserId) return;

    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      ToastAndroid.show(t("userLists.list.titleRequired"), ToastAndroid.LONG);
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      const description = draftDescription.trim();
      await firestore()
        .collection("users")
        .doc(targetUserId)
        .collection("lists")
        .doc(listId)
        .update({ name: trimmedTitle, description });

      // Optimistic update first, then close the editor so the header never
      // flickers (title changes while the panel disappears).
      onSaved(trimmedTitle, description);
      setIsEditing(false);
      ToastAndroid.show(t("userLists.list.saved"), ToastAndroid.SHORT);
    } catch (error) {
      logger.error("[useListEditing] Update list error:", error);
      ToastAndroid.show(t("userLists.list.saveError"), ToastAndroid.LONG);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    canEdit,
    targetUserId,
    listId,
    draftTitle,
    draftDescription,
    onSaved,
    t,
  ]);

  return {
    isEditing,
    draftTitle,
    draftDescription,
    isSaving,
    setDraftTitle,
    setDraftDescription,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
