/**
 * Shared style tokens for the gameDetails component family.
 *
 * These are consumed as `sharedStyles.sectionHeader` from several files, so they
 * cannot be a plain module-level `StyleSheet.create` — that would freeze the
 * colours at import time. `useSharedStyles()` returns a themed sheet instead.
 */
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export function useSharedStyles() {
  return useThemeStyles((c) => ({
    /** Section heading, 24 sp semi-bold, underlined. */
    sectionHeader: {
      color: c.text,
      fontSize: 24,
      fontWeight: "600",
      textDecorationLine: "underline",
      marginTop: 10,
    },
    /** Muted sub-text used in lists and secondary labels. */
    mutedText: {
      color: c.textSubtle,
    },
  }));
}
