import { useCallback, useState } from "react";
import { storageGet, storageSet } from "@/src/lib/storage";
import { VIEW_MODE_KEY } from "../constants";
import type { UserGamesViewMode } from "../types";

/**
 * The user's preferred list display mode, persisted to MMKV so it survives
 * restarts. The initial value is read synchronously in the state initializer,
 * so the very first paint already uses the saved mode (no list→grid flash).
 */
export function useViewModePreference(): {
  viewMode: UserGamesViewMode;
  setViewMode: (mode: UserGamesViewMode) => void;
} {
  const [viewMode, setViewModeState] = useState<UserGamesViewMode>(() =>
    storageGet<UserGamesViewMode>(VIEW_MODE_KEY) === "grid" ? "grid" : "list",
  );

  const setViewMode = useCallback((mode: UserGamesViewMode): void => {
    setViewModeState(mode);
    storageSet(VIEW_MODE_KEY, mode);
  }, []);

  return { viewMode, setViewMode };
}
