import { useEffect, useState } from "react";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { storageGet } from "@/src/lib/storage";
import { gameDetailsCacheKey } from "../lib/gameDetailsCacheKey";

/**
 * Whether the details screen may render its real content yet.
 *
 * On a repeat visit the payload is already in MMKV, so the screen is ready on
 * the very first render and no skeleton is shown. On a cold load it waits for
 * the navigation animation to settle: mounting the full section list mid-push is
 * what made this screen janky, and caused ANRs on low-end devices.
 */
export function useGameContentReady(initialGameID: number | string): boolean {
  const [isReady, setIsReady] = useState<boolean>(() => {
    if (!initialGameID) return false;
    return storageGet<unknown>(gameDetailsCacheKey(initialGameID)) !== null;
  });

  useEffect(() => {
    if (isReady) return; // Already ready from cache
    const task = runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, [isReady]);

  return isReady;
}
