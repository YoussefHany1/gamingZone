import { useState, useEffect, useCallback } from "react";
import * as Updates from "expo-updates";

export type OTAUpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "downloading"; progress: number } // 0 → 1
  | { status: "ready" } // downloaded, about to reload
  | { status: "error"; message: string }
  | { status: "up_to_date" };

/**
 * Checks for an available EAS OTA update when the app mounts.
 * If an update exists it downloads it silently, then reloads the JS bundle.
 *
 * Exposes `updateState` so the UI can render a blocking update screen while
 * the download is in progress.
 *
 * Safe to use in both EAS and Expo Go environments — when
 * `Updates.isEnabled` is false the hook stays idle.
 */
const useOTAUpdate = (): OTAUpdateState => {
  const [updateState, setUpdateState] = useState<OTAUpdateState>({
    status: "idle",
  });

  const runUpdateCheck = useCallback(async () => {
    // expo-updates is only active in production EAS builds.
    if (!Updates.isEnabled || __DEV__) return;

    try {
      setUpdateState({ status: "checking" });

      const result = await Updates.checkForUpdateAsync();

      if (!result.isAvailable) {
        setUpdateState({ status: "up_to_date" });
        return;
      }

      // ---- Download phase ----
      setUpdateState({ status: "downloading", progress: 0 });

      let progressValue = 0;

      // expo-updates doesn't expose fine-grained download progress events,
      // so we animate a simulated progress bar that runs up to 90% while the
      // real download completes, then jumps to 100% once fetchUpdateAsync resolves.
      const TICK_MS = 150;
      const TARGET = 0.88; // don't go past 88% until download finishes
      const interval = setInterval(() => {
        progressValue = Math.min(
          TARGET,
          progressValue + (TARGET - progressValue) * 0.07,
        );
        setUpdateState({ status: "downloading", progress: progressValue });
      }, TICK_MS);

      try {
        await Updates.fetchUpdateAsync();
      } finally {
        clearInterval(interval);
      }

      // Snap to 100% and reload
      setUpdateState({ status: "downloading", progress: 1 });

      // Brief pause so the user sees 100% before the reload
      await new Promise((r) => setTimeout(r, 600));

      setUpdateState({ status: "ready" });
      await Updates.reloadAsync();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown update error";
      if (__DEV__) console.warn("[useOTAUpdate] error:", message);
      setUpdateState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    runUpdateCheck();
  }, [runUpdateCheck]);

  return updateState;
};

export default useOTAUpdate;
