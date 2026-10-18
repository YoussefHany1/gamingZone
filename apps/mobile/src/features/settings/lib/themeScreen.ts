import {
  ACCENTS,
  ACCENT_IDS,
  type AccentId,
  type ConcreteAccentId,
} from "@/src/constants/theme";

/** The selectable accents: the two automatic modes first, then the hues. */
export const ACCENT_OPTIONS: AccentId[] = ["auto", "random", ...ACCENT_IDS];

/**
 * The concrete fill an accent swatch is drawn with.
 *
 * `auto` follows whatever the active palette resolved to; `random` shows the
 * accent rolled for this session, which is `auto` when "random" is not the
 * active preference.
 */
export function resolveSwatchColor(
  id: AccentId,
  activeAccent: string,
  resolvedAccent: ConcreteAccentId | "auto",
): string {
  if (id === "auto") return activeAccent;

  if (id === "random") {
    return resolvedAccent === "auto" ? ACCENTS.blue : ACCENTS[resolvedAccent];
  }

  return ACCENTS[id];
}
