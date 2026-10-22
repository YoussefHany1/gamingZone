import React, { memo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useGamificationStore } from "@/src/store/useGamificationStore";
import LevelUpOverlay from "./LevelUpOverlay";
import XpToast from "./XpToast";

/**
 * The app-wide gamification overlay.
 *
 * It is mounted once, next to the offline banner, so an XP award or a
 * level-up is reported wherever the user happens to be. Both parts read the
 * store directly rather than through `useGamification`, because they must
 * work even when the counters have not been loaded yet.
 */
const GamificationOverlay = memo((): React.ReactElement | null => {
  const uid = useAuthStore((state) => state.user?.uid ?? "");
  const { toast, levelUp } = useGamificationStore(
    useShallow((state) => {
      const entry = uid ? state.byUid[uid] : undefined;
      return {
        toast: entry?.toast ?? null,
        levelUp: entry?.levelUp ?? null,
      };
    }),
  );

  const dismissToast = useGamificationStore((state) => state.dismissToast);
  const dismissLevelUp = useGamificationStore((state) => state.dismissLevelUp);

  const onDismissToast = useCallback(() => {
    if (uid) dismissToast(uid);
  }, [uid, dismissToast]);

  const onDismissLevelUp = useCallback(() => {
    if (uid) dismissLevelUp(uid);
  }, [uid, dismissLevelUp]);

  if (!uid) return null;

  return (
    <>
      <XpToast toast={toast} onDismiss={onDismissToast} />
      <LevelUpOverlay levelUp={levelUp} onDismiss={onDismissLevelUp} />
    </>
  );
});

GamificationOverlay.displayName = "GamificationOverlay";
export default GamificationOverlay;
