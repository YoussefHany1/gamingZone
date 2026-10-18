import { useEffect, useState } from "react";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";

/**
 * Flips to `true` once the first frame has painted (via `runAfterInteractions`).
 *
 * Used to keep heavy work off the initial render — the games screen shows its
 * skeleton until this is `true`, and both screens gate ad loading on it.
 */
export function useDeferredMount(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const task = runAfterInteractions(() => setIsReady(true));
    return () => task.cancel();
  }, []);

  return isReady;
}
