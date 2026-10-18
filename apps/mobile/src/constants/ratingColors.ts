/**
 * ratingColors.ts — the theme-independent aggregate-rating colour scale.
 *
 * Lives in `src/constants/` (not with the game-details screen helpers) so the
 * rating badge is not owned by one surface: Phase 4's shared GameCard work
 * needs the same gradient on several card variants. The scale is semantic —
 * red → orange → green by score band — and deliberately *not* wired to the
 * theme registry: a 9.5/10 fades to grey in any palette, so the bands stay
 * fixed literals like the other semantic badge colours in
 * `gameDetails/utils.ts` (`getRatingColorCode`, which stays screen-local
 * there until a second consumer appears).
 *
 * Moved from `gameDetails/utils.ts` in Phase 4 (docs/known-gaps.md §6).
 */

/**
 * Returns a two-colour gradient tuple for a game's aggregate rating (0–10 scale).
 * Designed for use with LinearGradient in card badges/circles.
 */
export function getRatingGradient(rating: number): [string, string] {
  if (rating <= 2) return ["#8B0000", "#B22222"]; // very poor
  if (rating <= 4) return ["#FF4C4C", "#FF6B6B"]; // poor
  if (rating <= 6) return ["#FF8C00", "#FFA500"]; // average
  if (rating <= 8) return ["#7CB342", "#8BC34A"]; // good
  return ["#2E7D32", "#4CAF50"]; // excellent
}
