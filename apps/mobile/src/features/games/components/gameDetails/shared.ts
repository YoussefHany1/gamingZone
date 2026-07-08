/**
 * Shared style tokens for the gameDetails component family.
 * Import `sharedStyles` instead of repeating the same declarations.
 */
import { StyleSheet } from "react-native";
import COLORS from "@/src/constants/colors";

export const sharedStyles = StyleSheet.create({
  /** Section heading: white, underlined, 24 sp semi-bold */
  sectionHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  /** Muted sub-text used in lists and secondary labels */
  mutedText: {
    color: "#9f9f9f",
  },
});
