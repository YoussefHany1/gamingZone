import { useEffect, useState } from "react";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";

/**
 * Flips to `true` once the JS thread has finished the interactions queued at
 * mount time.
 *
 * Screens use it to keep expensive-but-secondary subtrees (ads, the full form)
 * off the first frame: the screen paints its essential content, then this
 * reports ready on the next idle slice.
 */
export function useDeferredReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const task = runAfterInteractions(() => setIsReady(true));
    return () => task.cancel();
  }, []);

  return isReady;
}
