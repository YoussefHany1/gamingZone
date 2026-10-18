import { useMemo } from "react";
import {
  APPEARANCE_IDS,
  resolveAppearancePalette,
} from "@/src/constants/theme";
import type { ThemeColors } from "@/src/constants/colors";
import { useThemeStore } from "@/src/store/useThemeStore";

export type AppearancePalettes = Record<string, ThemeColors>;

/**
 * Pre-resolves every appearance's palette so each tile can be fully memoised
 * and drawn in the colours it is offering, rather than in the active ones.
 */
export function useAppearancePalettes(): AppearancePalettes {
  const systemScheme = useThemeStore((state) => state.systemScheme);
  const resolvedAccent = useThemeStore((state) => state.resolvedAccent);

  return useMemo(() => {
    const palettes: AppearancePalettes = {};
    for (const id of APPEARANCE_IDS) {
      palettes[id] = resolveAppearancePalette(id, systemScheme, resolvedAccent);
    }
    return palettes;
  }, [systemScheme, resolvedAccent]);
}
